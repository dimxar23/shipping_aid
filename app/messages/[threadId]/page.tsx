"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type ThreadRow = {
  id: string;
  user1: string;
  user2: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function shortId(id: string) {
  return id ? id.slice(0, 8) : "";
}

function nameOf(id: string, usernames: Record<string, string>) {
  return usernames[id] || `user_${shortId(id)}`;
}

export default function ThreadPage() {
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId;

  const [meId, setMeId] = useState<string | null>(null);

  const [thread, setThread] = useState<ThreadRow | null>(null);
  const [other, setOther] = useState<ProfileRow | null>(null);

  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<MessageRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [text, setText] = useState("");

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

  const avatarStyle: React.CSSProperties = {
    width: 44,
    height: 44,
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

  const otherLabel = useMemo(() => {
    if (!other) return null;
    return other.username?.trim() || `user_${shortId(other.id)}`;
  }, [other]);

  async function loadUsernames(userIds: string[]) {
    const uniq = Array.from(new Set(userIds)).filter(Boolean);
    if (uniq.length === 0) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", uniq);

    if (error || !data) return;

    const map: Record<string, string> = {};
    for (const p of data as { id: string; username: string | null }[]) {
      map[p.id] = p.username?.trim() || `user_${shortId(p.id)}`;
    }
    setUsernames((prev) => ({ ...prev, ...map }));
  }

  async function loadAll() {
    if (!threadId) return;

    setLoading(true);
    setErrorMsg("");

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push(`/login?next=/messages/${encodeURIComponent(threadId)}`);
      return;
    }
    setMeId(auth.user.id);

    // 1) Load thread
    const { data: t, error: tErr } = await supabase
      .from("message_threads")
      .select("id, user1, user2")
      .eq("id", threadId)
      .maybeSingle<ThreadRow>();

    if (tErr) {
      setErrorMsg(tErr.message);
      setLoading(false);
      return;
    }
    if (!t) {
      setErrorMsg("Thread not found.");
      setLoading(false);
      return;
    }

    // Ensure user participates
    if (t.user1 !== auth.user.id && t.user2 !== auth.user.id) {
      setErrorMsg("You do not have access to this conversation.");
      setLoading(false);
      return;
    }

    setThread(t);

    const otherId = t.user1 === auth.user.id ? t.user2 : t.user1;

    // 2) Load other profile (avatar + username)
    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", otherId)
      .maybeSingle<ProfileRow>();

    if (!pErr && p) setOther(p);

    // 3) Load messages
    const { data: ms, error: mErr } = await supabase
      .from("messages")
      .select("id, thread_id, sender_id, body, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (mErr) {
      setErrorMsg(mErr.message);
      setMessages([]);
      setLoading(false);
      return;
    }

    const list = (ms || []) as MessageRow[];
    setMessages(list);

    await loadUsernames([auth.user.id, otherId, ...list.map((x) => x.sender_id)]);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  async function send() {
    if (!meId || !threadId) return;
    const body = text.trim();
    if (!body) return;

    setSending(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.from("messages").insert({
        thread_id: threadId,
        sender_id: meId,
        body,
      });

      if (error) throw error;

      setText("");
      await loadAll();
    } catch (e: any) {
      setErrorMsg(e?.message || "Could not send message.");
    } finally {
      setSending(false);
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={avatarStyle}>
            {other?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={other.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span>{(otherLabel?.[0] || "U").toUpperCase()}</span>
            )}
          </div>

          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>
              Chat with {otherLabel || "user"}
            </h1>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>
              Thread: {thread?.id}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/messages" style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.18)", textDecoration: "none", color: "inherit" }}>
            Back to inbox
          </Link>
          <button onClick={loadAll} style={{ padding: "8px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.18)" }}>
            Refresh
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div style={{ ...cardStyle, border: "1px solid rgba(255,80,80,0.5)", background: "rgba(255,80,80,0.12)" }}>
          {errorMsg}
        </div>
      ) : null}

      {/* Messages */}
      <section style={cardStyle}>
        {messages.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No messages yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {messages.map((m) => {
              const mine = m.sender_id === meId;
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: mine ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: 720,
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: mine ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.22)",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
                      {nameOf(m.sender_id, usernames)} • {new Date(m.created_at).toLocaleString()}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Composer */}
      <section style={cardStyle}>
        <div style={{ display: "grid", gap: 10 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Write a message…"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(0,0,0,0.18)",
              color: "inherit",
              resize: "vertical",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              style={{
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.18)",
                cursor: "pointer",
              }}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
