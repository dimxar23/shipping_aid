// app/login/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Αν το URL έχει mode=signup/signin
    const urlMode = (searchParams.get("mode") || "").toLowerCase();
    if (urlMode === "signup") setMode("signup");
    if (urlMode === "signin") setMode("signin");

    // Αν υπάρχει msg=...
    const m = searchParams.get("msg");
    if (m) setMsg(m);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created. Please check your email to confirm your address.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const next = searchParams.get("next") || "/";
        router.push(next);
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>

      {msg ? <p style={{ marginTop: 10 }}>{msg}</p> : null}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        style={{ marginTop: 12 }}
      >
        {mode === "signin"
          ? "No account? Create one"
          : "Already have an account? Sign in"}
      </button>

      <button
        onClick={() => router.push("/")}
        style={{ marginTop: 12, display: "block" }}
      >
        Back to home
      </button>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 420, margin: "60px auto", padding: 16 }}>
          <p>Loading…</p>
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
