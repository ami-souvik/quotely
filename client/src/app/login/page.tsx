'use client';

import React, { useEffect } from 'react';
import { useAuth } from "react-oidc-context";
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

const LoginPage: React.FC = () => {
  const auth = useAuth();
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      // Sync with useAuthStore
      const authUser = {
        id: auth.user.profile.sub || '',
        email: auth.user.profile.email || '',
        first_name: '',
        last_name: '',
        role: 'ADMIN' as 'ADMIN',
        org_id: 'default',
        org_name: 'Default Org'
      };
      setUser(authUser);
      router.push('/quotes');
    }
  }, [auth.isAuthenticated, auth.user, router, setUser]);

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