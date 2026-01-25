'use client';

import React, { useEffect } from 'react';
import { useAuth } from "react-oidc-context";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Quote, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const LoginPage: React.FC = () => {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      router.push('/quotes');
    }
  }, [auth.isAuthenticated, auth.user, router]);

  if (auth.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-background text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
        </div>
        <h3 className="text-lg font-semibold">Authentication Error</h3>
        <p className="text-muted-foreground">{auth.error.message}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 md:p-8">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="mb-8 flex items-center space-x-2 transition-transform hover:scale-105">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Quote className="h-6 w-6 fill-current" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Quotely</span>
          </Link>

          <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-xl">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

            <h2 className="mb-2 text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="mb-8 text-muted-foreground">
              Sign in to continue creating professional quotations.
            </p>

            <div className="space-y-4">
              <Button
                onClick={() => auth.signinRedirect()}
                className="w-full h-11 text-base shadow-lg shadow-primary/10 transition-all hover:shadow-primary/20"
                size="lg"
              >
                Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Secure Authentication
                  </span>
                </div>
              </div>

              <p className="px-8 text-center text-xs text-muted-foreground">
                By clicking login, you agree to our <a href="#" className="underline hover:text-primary">Terms of Service</a> and <a href="#" className="underline hover:text-primary">Privacy Policy</a>.
              </p>
            </div>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Don&apos;t have an account? <span className="text-primary font-medium">Sign up via Login</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;