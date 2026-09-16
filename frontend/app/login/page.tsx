import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AuthForm from "@/components/auth-form";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/");

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">MARKET INTELLIGENCE</p>
        <h1 id="login-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to access your stock intelligence dashboard.</p>
        <AuthForm mode="login" />
        <p className="auth-switch">New here? <Link href="/signup">Create an account</Link></p>
      </section>
    </main>
  );
}
