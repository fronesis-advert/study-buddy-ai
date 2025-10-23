import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <Link href="/" className="mx-auto">
            <h1 className="text-3xl font-bold tracking-tight">Study Buddy AI</h1>
          </Link>
          <p className="text-sm text-muted-foreground">
            Your AI-powered learning companion
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}