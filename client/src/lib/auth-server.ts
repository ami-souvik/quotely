import { CognitoJwtVerifier } from "aws-jwt-verify";
import { services } from "@/lib/services";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

// Initialize Verifier
// Note: Ensure COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID are set in environment variables
const userPoolId = process.env.COGNITO_USER_POOL_ID || process.env.NEXT_PUBLIC_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID || process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;

if (!userPoolId || !clientId) {
    console.warn("Cognito environment variables missing. Auth will fail.");
}

// Lazy init to avoid build-time errors if env vars are missing
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

const getVerifier = () => {
  if (!verifier) {
    if (!userPoolId || !clientId) {
      throw new Error("Cognito userPoolId or clientId is missing in environment variables.");
    }
    verifier = CognitoJwtVerifier.create({
      userPoolId: userPoolId,
      tokenUse: "id",
      clientId: clientId,
    });
  }
  return verifier;
};

export interface AuthUser {
  id: string; // sub
  username: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  org_id: string;
  org_name: string;
}

export async function authenticate(request: Request): Promise<AuthUser | null> {
  // 1. Try NextAuth Session first (for App Router API routes)
  try {
      const session = await getServerSession(authOptions);
      if (session) {
        // console.log("DEBUG: check session", JSON.stringify(session, null, 2));
      }
      if (session && session.user && session.user.org_id) {
          return {
              id: session.user.id,
              username: session.user.email || session.user.id,
              email: session.user.email || "",
              role: (session.user.role as 'ADMIN' | 'EMPLOYEE') || 'EMPLOYEE',
              org_id: session.user.org_id,
              org_name: session.user.org_name || ""
          };
      } else if (session?.user) {
          console.warn("Session exists but missing org_id. User might need to re-login.", session.user);
      }
  } catch (e) {
      console.error("Failed to retrieve session in authenticate:", e);
      // Fallback to token
  }

  // 2. Fallback to Bearer Token (Cognito Direct)
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];

  try {
    const payload = await getVerifier().verify(token);
    
    const userId = payload.sub;
    const role = (payload["custom:role"] as 'ADMIN' | 'EMPLOYEE') || 'EMPLOYEE';
    const orgName = payload["custom:org_name"] as string;
    let orgId = payload["custom:org_id"] as string;
    // Access token usage: email might not be present standardly unless 'email' scope and readable.
    const email = (payload["email"] as string) || ""; 

    if ((!orgId) && orgName) {
         // Resolve Org ID via DynamoDB
         const resolvedId = await services.getOrganizationIdByName(orgName);
         if (resolvedId) {
             orgId = resolvedId;
         } else {
             const createdId = await services.createOrganization(orgName);
             if (createdId) orgId = createdId;
         }
    }

    if (!orgId) {
        console.error("Organization ID not found and could not be created/resolved.");
        // We can optionally fail here or return user without org (but app logic depends on org)
        return null;
    }

    return {
        id: userId,
        username: payload.username as string,
        email,
        role,
        org_id: orgId,
        org_name: orgName
    };
  } catch (err) {
    console.error("Token verification failed:", err);
    return null;
  }
}
