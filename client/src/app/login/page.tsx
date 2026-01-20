'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import api, { useAuthStore } from '@/lib/api/client';
import { ArrowRight } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, setError } = useForm();
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  const onSubmit = async (data: any) => {
    try {
      const response = await api.post('/auth/login/', {
        username: data.username,
        password: data.password,
      });

      const { access, refresh, user } = response.data;
      setTokens(access, refresh);
      setUser(user);
      router.push('/quotes');
    } catch (error: any) {
      setError("root.serverError", {
        type: "manual",
        message: "Invalid credentials. Please check your username and password.",
      });
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-5xl font-medium text-foreground">Quotely</h1>
          <p className="text-muted-foreground mt-2">Welcome back. Please sign in.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-foreground">Username</label>
            <input
              id="username"
              className="w-full px-4 py-3 bg-card border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              placeholder="e.g. johndoe"
              {...register("username", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 bg-card border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              {...register("password", { required: true })}
            />
          </div>

          {errors.root?.serverError && (
            <p className="text-sm text-center font-medium text-red-500">
              {String(errors.root.serverError.message)}
            </p>
          )}

          <div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium px-4 py-3 rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background"
            >
              Sign In
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-12">
          <a href="#" className="underline hover:text-primary">
            Can't sign in? Contact support
          </a>
        </p>
      </div>
    </main>
  );
};

export default LoginPage;