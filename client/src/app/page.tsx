'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/api/client';
import { useAuth } from "react-oidc-context";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Quote, Zap, Smartphone, CheckCircle, ArrowRight } from 'lucide-react';

export default function Home() {
    const router = useRouter();
    const { user, isLoading: isStoreLoading } = useAuthStore();
    const auth = useAuth();
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    useEffect(() => {
        // If OIDC is processing (e.g. code exchange), wait.
        if (auth.isLoading) return;

        // If OIDC is authenticated, ensure store is synced and redirect
        if (auth.isAuthenticated) {
            router.replace('/quotes');
            return;
        }

        // Fallback to store check (for persistence across reloads if OIDC state matches)
        if (!isStoreLoading) {
            if (user) {
                router.replace('/quotes');
            } else {
                // If not authenticated, show the landing page
                setIsCheckingAuth(false);
            }
        }
    }, [user, isStoreLoading, auth.isLoading, auth.isAuthenticated, auth.user, router]);

    if (isCheckingAuth) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
                    <p className="text-muted-foreground font-medium">Loading Quotely...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
                    <div className="flex items-center space-x-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Quote className="h-5 w-5 fill-current" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">Quotely</span>
                    </div>
                    <Link href="/login">
                        <Button variant="ghost" className="font-semibold">
                            Login
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 lg:pt-32">
                    <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
                    <div className="container mx-auto flex flex-col items-center px-4 text-center sm:px-8">
                        <div className="mb-6 inline-flex items-center rounded-full border border-border bg-background/50 px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm">
                            <span className="mr-2 flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            Professional Quotes in Seconds
                        </div>
                        <h1 className="mb-6 max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                            Quotations made <br className="hidden sm:block" />
                            <span className="text-primary">Effortless.</span>
                        </h1>
                        <p className="mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl md:text-2xl leading-relaxed">
                            Generate quotations in less than a minute. A mobile-first utility designed for quickly creating professional quotes on the go.
                        </p>
                        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                            <Link href="/login">
                                <Button size="lg" className="h-12 px-8 text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                    Get Started
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="h-12 px-8 text-lg rounded-full backdrop-blur-sm">
                                Learn More
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="container mx-auto px-4 py-24 sm:px-8">
                    <div className="grid gap-8 md:grid-cols-3">
                        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-lg transition-all duration-300">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Zap className="h-6 w-6" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold">Lightning Fast</h3>
                            <p className="text-muted-foreground">
                                Create and export professional quotations in under 60 seconds. Speed without compromising quality.
                            </p>
                        </div>
                        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-lg transition-all duration-300">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <Smartphone className="h-6 w-6" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold">Mobile First</h3>
                            <p className="text-muted-foreground">
                                Designed from the ground up for mobile devices. specific utility for on the go professionals.
                            </p>
                        </div>
                        <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:shadow-lg transition-all duration-300">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <h3 className="mb-3 text-xl font-bold">Professional Output</h3>
                            <p className="text-muted-foreground">
                                Generate clean, branded PDFs that look professional and ready to send to your clients immediately.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-border bg-muted/30">
                <div className="container mx-auto py-8 flex flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-8">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Qurtesy Labs. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                        <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                        <a href="#" className="hover:text-primary transition-colors">Terms</a>
                        <a href="#" className="hover:text-primary transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}