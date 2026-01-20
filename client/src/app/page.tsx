'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/api/client';

export default function Home() {
    const router = useRouter();
    const { user, isLoading } = useAuthStore();

    useEffect(() => {
        if (!isLoading) {
            if (user) {
                router.replace('/quotes');
            } else {
                router.replace('/login');
            }
        }
    }, [user, isLoading, router]);

    return (
        <div className="flex h-screen items-center justify-center">
            <div className="flex items-center space-x-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                <p className="text-muted-foreground">Loading...</p>
            </div>
        </div>
    );
}
