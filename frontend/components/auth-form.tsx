"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = { mode: "login" | "signup" };

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = mode === "signup"
      ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
      : await authClient.signIn.email({ email: email.trim(), password });

    setPending(false);
    if (result.error) {
      setError("We could not authenticate with those details. Please check them and try again.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {mode === "signup" && (
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />
        </label>
      )}
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
      </label>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={pending}>
        {pending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
