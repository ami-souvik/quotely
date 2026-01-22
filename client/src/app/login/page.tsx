'use client';

import React, { useEffect } from 'react';
import { useAuth } from "react-oidc-context";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const LoginPage: React.FC = () => {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      router.push('/quotes');
    }
  }, [auth.isAuthenticated, auth.user, router]);

  if (auth.isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (auth.error) {
    return <div className="flex justify-center items-center min-h-screen">Error: {auth.error.message}</div>;
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen space-y-4">
      <h1 className="text-2xl font-bold">Welcome to Quotely</h1>
      <Button onClick={() => auth.signinRedirect()}>
        Sign in with AWS Cognito
      </Button>
    </div>
  );
};

export default LoginPage;