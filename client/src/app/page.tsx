'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/api/client';
import { useAuth } from "react-oidc-context";

export default function Home() {
    const router = useRouter();
    const { user, isLoading: isStoreLoading } = useAuthStore();
    const auth = useAuth();

    useEffect(() => {
        // If OIDC is processing (e.g. code exchange), wait.
        if (auth.isLoading) return;

        // If OIDC is authenticated, ensure store is synced and redirect
        if (auth.isAuthenticated) {
            router.replace('/quotes');
            return;
        }

        // // Fallback to store check (for persistence across reloads if OIDC state matches)
        if (!isStoreLoading) {
            if (user) {
                router.replace('/quotes');
            } else {
                // Only redirect to login if we are SURE we aren't loading anything
                router.replace('/login');
            }
        }
    }, [user, isStoreLoading, auth.isLoading, auth.isAuthenticated, auth.user, router]);

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="flex items-center space-x-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                <p className="text-muted-foreground">Loading...</p>
            </div>
        </div>
    );
}