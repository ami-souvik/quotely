'use client';

import { AuthProvider } from "react-oidc-context";
import { User } from "oidc-client-ts";
import { useAuthStore } from "@/lib/api/client";

// Determine the redirect URI dynamically if not set
// In Cognito, you must add this URI (e.g., http://localhost:3000/ or https://your-domain.com/) 
// to the "Allowed callback URLs" and "Allowed sign-out URLs".
const redirectUri = typeof window !== 'undefined'
  ? window.location.origin
  : (process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000");

const cognitoAuthConfig = {
  authority: process.env.NEXT_PUBLIC_COGNITO_AUTHORITY || "https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_BvTJlEG5R",
  client_id: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || "5dqss2ei776k8n7jb9e54le8q4",
  redirect_uri: redirectUri,
  response_type: "code",
  scope: "email openid phone profile",
};

export default function CognitoAuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser } = useAuthStore();
  const onSigninCallback = (_user: User | void): void => {
    if (_user) setUser(_user);
    // This removes the code/state parameters from the URL after successful login
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  return (
    <AuthProvider {...cognitoAuthConfig} onSigninCallback={onSigninCallback}>
      {children}
    </AuthProvider>
  );
}