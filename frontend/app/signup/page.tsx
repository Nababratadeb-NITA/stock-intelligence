import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import AuthForm from "@/components/auth-form";
import { auth } from "@/lib/auth";

export default async function SignupPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/");

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="signup-title">
        <p className="eyebrow">STOCK INTELLIGENCE</p>
        <h1 id="signup-title">Create your account</h1>
        <p className="auth-subtitle">Keep your market research in one focused workspace.</p>
        <AuthForm mode="signup" />
        <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
