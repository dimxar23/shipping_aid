"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
      setUserId(session?.user?.id ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <p style={{ padding: 40 }}>Loading…</p>;
  }

  // GUEST
  if (!userId) {
    return (
      <main style={{ maxWidth: 900, margin: "100px auto", padding: 16 }}>
        <h1 style={{ fontSize: 42, fontWeight: 900 }}>Shipping Aid</h1>
        <p style={{ opacity: 0.8 }}>
          A private community for shipping professionals.
        </p>

        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/login")}>Sign in</button>
          <button onClick={() => router.push("/login?mode=signup")}>
            Create account
          </button>
        </div>
      </main>
    );
  }

  // SIGNED IN
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <section className="glass" style={{ padding: 20, marginTop: 14 }}>
        <h2 style={{ marginBottom: 14 }}>Choose a subject</h2>

        <button
          className="glass"
          onClick={() => router.push("/q/sea-personnel")}
          style={{
            width: "100%",
            textAlign: "left",
            padding: 16,
            marginBottom: 14,
            cursor: "pointer",
          }}
        >
          <h3 style={{ margin: 0 }}>Topics related to Sea Personnel</h3>
          <p style={{ opacity: 0.8, marginTop: 8 }}>
            Questions from sea personnel such as Master, C/O, C/E, 2/E, 2/O, 3/E,
            ETO and other seafarers.
          </p>
        </button>

        <button
          className="glass"
          onClick={() => router.push("/q/shore-personnel")}
          style={{
            width: "100%",
            textAlign: "left",
            padding: 16,
            cursor: "pointer",
          }}
        >
          <h3 style={{ margin: 0 }}>Topics related to Shore Personnel</h3>
          <p style={{ opacity: 0.8, marginTop: 8 }}>
            Questions from shore-based personnel such as Superintendents, CSO,
            DPA and other shore-based professionals.
          </p>
        </button>

        <div style={{ marginTop: 14, fontSize: 13, opacity: 0.75 }}>
          Signed in as {email ?? userId}
        </div>
      </section>
    </main>
  );
}
