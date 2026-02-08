
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import CognitoProvider from "next-auth/providers/cognito";
import { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import crypto from 'crypto';

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
                }
            },
        }),
        CredentialsProvider({
            name: "Cognito",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const creds = credentials as Record<string, string>;
                const username = creds?.email || creds?.username; // This will now hold the email
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

                    // Helper to get user attributes
                    const getUserAttributes = async (accessToken: string) => {
                        try {
                            const getUserCmd = new GetUserCommand({ AccessToken: accessToken });
                            const userRes = await client.send(getUserCmd);
                            const attrs = userRes.UserAttributes || [];
                            const name = attrs.find(a => a.Name === 'name')?.Value;
                            const given = attrs.find(a => a.Name === 'given_name')?.Value;
                            const family = attrs.find(a => a.Name === 'family_name')?.Value;
                            return name || (given ? `${given} ${family || ''}`.trim() : null);
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
                            const accessToken = challengeResponse.AuthenticationResult.AccessToken;
                            const fullName = await getUserAttributes(accessToken);

                            return {
                                id: username,
                                email: username,
                                name: fullName || username.split('@')[0], 
                                accessToken: accessToken, 
                            }
                        }
                    }

                    if (response.AuthenticationResult?.AccessToken) {
                         const accessToken = response.AuthenticationResult.AccessToken;
                         const fullName = await getUserAttributes(accessToken);

                         return {
                            id: username, 
                            email: username,
                            name: fullName || username.split('@')[0], 
                            accessToken: accessToken, 
                         }
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
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.email = user.email;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.name = token.name;
                session.user.email = token.email;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
