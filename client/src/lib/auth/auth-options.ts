
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import CognitoProvider from "next-auth/providers/cognito";
import { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import crypto from 'crypto';
import { services } from "@/lib/services";

function calculateSecretHash(username: string, clientId: string, clientSecret: string) {
    return crypto.createHmac('sha256', clientSecret)
        .update(username + clientId)
        .digest('base64');
}

export const authOptions: NextAuthOptions = {
    providers: [
        CognitoProvider({
            clientId: process.env.COGNITO_CLIENT_ID!,
            clientSecret: process.env.COGNITO_CLIENT_SECRET || "",
            issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
            checks: ['nonce', 'pkce'],
            profile(profile) {
                const name = profile.name;
                const given = profile.given_name;
                const family = profile.family_name;
                const constructedName = given ? `${given} ${family || ''}`.trim() : null;
                
                return {
                    id: profile.sub,
                    name: name || constructedName || profile.email, 
                    email: profile.email,
                    image: profile.picture,
                    org_id: profile["custom:org_id"],
                    org_name: profile["custom:org_name"],
                    role: profile["custom:role"],
                    username: profile["username"] || profile["preferred_username"] || profile.email,
                }
            },
        }),
        CredentialsProvider({
            name: "Cognito",
            credentials: {
                username: { label: "Username", type: "username" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const creds = credentials as Record<string, string>;
                const username = creds?.username;
                const password = creds?.password;

                if (!username || !password) {
                    console.error("Missing credentials. Received:", credentials);
                    return null;
                }

                const region = process.env.AWS_REGION;
                const clientId = process.env.COGNITO_CLIENT_ID;

                console.log("Auth Debug - Region:", region);
                console.log("Auth Debug - ClientID Present:", !!clientId);

                const client = new CognitoIdentityProviderClient({
                    region: region
                });

                try {
                    // Debug logs
                    console.log("Attempting Cognito Login for:", username);
                    
                    const secretHash = process.env.COGNITO_CLIENT_SECRET && process.env.COGNITO_CLIENT_ID
                        ? calculateSecretHash(username, process.env.COGNITO_CLIENT_ID, process.env.COGNITO_CLIENT_SECRET)
                        : undefined;

                    const command = new InitiateAuthCommand({
                        AuthFlow: "USER_PASSWORD_AUTH",
                        ClientId: process.env.COGNITO_CLIENT_ID,
                        AuthParameters: {
                            USERNAME: username,
                            PASSWORD: password,
                            ...(secretHash && { SECRET_HASH: secretHash }),
                        },
                    });

                    const response = await client.send(command);

                    // Helper to get user attributes and resolve org
                    const resolveUser = async (accessToken: string) => {
                        try {
                            const getUserCmd = new GetUserCommand({ AccessToken: accessToken });
                            const userRes = await client.send(getUserCmd);
                            const attrs = userRes.UserAttributes || [];
                            
                            const name = attrs.find((a: any) => a.Name === 'name')?.Value;
                            const given = attrs.find((a: any) => a.Name === 'given_name')?.Value;
                            const family = attrs.find((a: any) => a.Name === 'family_name')?.Value;
                            let orgId = attrs.find((a: any) => a.Name === 'custom:org_id')?.Value;
                            const orgName = attrs.find((a: any) => a.Name === 'custom:org_name')?.Value;
                            const role = attrs.find((a: any) => a.Name === 'custom:role')?.Value;

                            // Resolve Org ID if missing but Org Name exists
                            if (!orgId && orgName) {
                                try {
                                    const resolvedId = await services.getOrganizationIdByName(orgName);
                                    if (resolvedId) {
                                        orgId = resolvedId;
                                    } else {
                                        const createdId = await services.createOrganization(orgName);
                                        if (createdId) orgId = createdId;
                                    }
                                } catch (e) {
                                    console.error("Org resolution failed during login:", e);
                                }
                            }

                            return {
                                id: username, // Fallback ID, should ideally be sub from attrs but username works for keying
                                name: name || (given ? `${given} ${family || ''}`.trim() : null) || username.split('@')[0],
                                email: username,
                                org_id: orgId,
                                org_name: orgName,
                                role: role,
                                accessToken: accessToken,
                            };
                        } catch (err) {
                            console.error("Failed to fetch user attributes:", err);
                            return null;
                        }
                    };

                    if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                        const challengeCommand = new RespondToAuthChallengeCommand({
                            ChallengeName: "NEW_PASSWORD_REQUIRED",
                            ClientId: process.env.COGNITO_CLIENT_ID,
                            ChallengeResponses: {
                                USERNAME: username,
                                NEW_PASSWORD: password, // Setting the provided password as the permanent one
                                ...(secretHash && { SECRET_HASH: secretHash }),
                            },
                            Session: (response.Session as string),
                        });
                        
                        const challengeResponse = await client.send(challengeCommand);

                        if (challengeResponse.AuthenticationResult?.AccessToken) {
                            return await resolveUser(challengeResponse.AuthenticationResult.AccessToken);
                        }
                    }

                    if (response.AuthenticationResult?.AccessToken) {
                         return await resolveUser(response.AuthenticationResult.AccessToken);
                    }
                    console.warn("Cognito Login successful but no AuthenticationResult. ChallengeName:", response.ChallengeName);
                    return null;
                } catch (error: any) {
                    console.error("Cognito Login Error Details:", JSON.stringify(error, null, 2));
                    
                    if (error.name === 'UserNotConfirmedException') {
                         throw new Error("Please verify your email before logging in.");
                    }
                    if (error.name === 'NotAuthorizedException') {
                         throw new Error("Invalid email or password.");
                    }
                    
                    throw new Error(error.message || "Login failed");
                }
            }
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user, account }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.email = user.email;
                token.org_id = user.org_id;
                token.org_name = user.org_name;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                // @ts-ignore
                session.user.id = token.id as string;
                session.user.name = token.name;
                session.user.email = token.email;
                // @ts-ignore
                session.user.org_id = token.org_id as string;
                // @ts-ignore
                session.user.org_name = token.org_name as string;
                // @ts-ignore
                session.user.role = token.role as string;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
