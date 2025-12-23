// app/messages/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type ThreadRow = {
  id: string;
  user1: string;
  user2: string;
  created_at?: string;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function shortId(id: string) {
  return id ? id.slice(0, 8) : "";
}

function MessagesInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [targetInput, setTargetInput] = useState("");
  const [toParam, setToParam] = useState<string | null>(null);
  const [targetProfile, setTargetProfile] = useState<ProfileRow | null>(null);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const headerStyle: React.CSSProperties = {
    maxWidth: 1100,
    margin: "0 auto",
    padding: 16,
  };

  const cardStyle: React.CSSProperties = {
    padding: 20,
    marginTop: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.28)",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  };

  const inputStyle: React.CSSProperties = {
    flex: "1 1 380px",
    padding: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.18)",
    color: "inherit",
    outline: "none",
  };

  const btnStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.18)",
    cursor: "pointer",
  };

  const avatarStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 999,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.25)",
    flex: "0 0 auto",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    opacity: 0.9,
  };

  const toLabel = useMemo(() => {
    if (!targetProfile) return null;
    return targetProfile.username?.trim() || `user_${shortId(targetProfile.id)}`;
  }, [targetProfile]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login?next=/messages");
        return;
      }
      if (cancelled) return;

      setMeId(data.user.id);

      const to = sp.get("to");
      setToParam(to);

      setLoading(false);
    }

    init();

    return () => {
      cancelled = true;
    };
    // ✅ εδώ θέλουμε sp/router να είναι dependency
  }, [router, sp]);

  useEffect(() => {
    let cancelled = false;

    async function resolveToParam() {
      setErrorMsg("");

      if (!toParam) {
        setTargetProfile(null);
        return;
      }

      if (isUuid(toParam)) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", toParam)
          .maybeSingle<ProfileRow>();

        if (cancelled) return;

        if (error) return setErrorMsg(error.message);
        if (!data) return setErrorMsg("User not found.");
        setTargetProfile(data);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("username", toParam)
        .maybeSingle<ProfileRow>();

      if (cancelled) return;

      if (error) return setErrorMsg(error.message);
      if (!data) return setErrorMsg("User not found.");
      setTargetProfile(data);
    }

    if (!loading) resolveToParam();

    return () => {
      cancelled = true;
    };
  }, [toParam, loading]);

  async function getOrCreateThread(otherUserId: string) {
    if (!meId) throw new Error("Not signed in.");
    if (otherUserId === meId) throw new Error("You cannot message yourself.");

    const { data: existing, error: exErr } = await supabase
      .from("message_threads")
      .select("id, user1, user2")
      .or(
        `and(user1.eq.${meId},user2.eq.${otherUserId}),and(user1.eq.${otherUserId},user2.eq.${meId})`
      )
      .maybeSingle<ThreadRow>();

    if (exErr && (exErr as any).code !== "PGRST116") throw exErr;
    if (existing?.id) return existing.id;

    const { data: created, error: crErr } = await supabase
      .from("message_threads")
      .insert({ user1: meId, user2: otherUserId })
      .select("id")
      .single<{ id: string }>();

    if (crErr) throw crErr;
    return created.id;
  }

  async function startFromDeepLink() {
    if (!targetProfile?.id) return;
    setBusy(true);
    setErrorMsg("");

    try {
      const threadId = await getOrCreateThread(targetProfile.id);
      router.push(`/messages/${threadId}`);
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not start chat.");
    } finally {
      setBusy(false);
    }
  }

  async function startFromInput() {
    if (!meId) return;
    const raw = targetInput.trim();
    if (!raw) return setErrorMsg("Enter a username or user id.");

    setBusy(true);
    setErrorMsg("");

    try {
      let otherId: string | null = null;

      if (isUuid(raw)) {
        otherId = raw;
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", raw)
          .maybeSingle<{ id: string }>();

        if (error) throw error;
        if (!data?.id) throw new Error("User not found.");
        otherId = data.id;
      }

      const threadId = await getOrCreateThread(otherId);
      router.push(`/messages/${threadId}`);
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not start chat.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main style={headerStyle}>
        <div style={cardStyle}>Loading…</div>
      </main>
    );
  }

  return (
    <main style={headerStyle}>
      <h1 style={{ fontSize: 40, fontWeight: 900, margin: "10px 0 8px" }}>
        Messages
      </h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        Private conversations (only participants can view).
      </div>

      {targetProfile ? (
        <section style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={avatarStyle}>
              {targetProfile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={targetProfile.avatar_url}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span>{(targetProfile.username?.[0] || "U").toUpperCase()}</span>
              )}
            </div>

            <div style={{ minWidth: 260 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                Send message to <span style={{ opacity: 0.95 }}>{toLabel}</span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                This opens a private chat thread with this user.
              </div>
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <button style={btnStyle} onClick={startFromDeepLink} disabled={busy}>
                {busy ? "Opening…" : "Open chat"}
              </button>
              <button style={btnStyle} onClick={() => router.push("/messages")} disabled={busy}>
                Clear
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section style={cardStyle}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Start a new chat</div>

        <div style={rowStyle}>
          <input
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="Enter username (e.g. seaman21) or user id"
            style={inputStyle}
          />
          <button style={btnStyle} onClick={startFromInput} disabled={busy}>
            {busy ? "Working…" : "Message"}
          </button>
        </div>

        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
          Tip: usernames are stored in Profile Settings.
        </div>

        {errorMsg ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,80,80,0.5)",
              background: "rgba(255,80,80,0.12)",
            }}
          >
            {errorMsg}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
          <div
            style={{
              padding: 20,
              marginTop: 14,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.28)",
            }}
          >
            Loading…
          </div>
        </main>
      }
    >
      <MessagesInner />
    </Suspense>
  );
}
