"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wrap: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: 16 };

  const card: React.CSSProperties = {
    padding: 20,
    marginTop: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.28)",
  };

  const btn: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.18)",
    cursor: "pointer",
  };

  async function load() {
    setLoading(true);
    setErrorMsg(null);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      router.push("/login?next=/notifications");
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, body, read, created_at")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      setItems([]);
    } else {
      setItems((data || []) as NotificationRow[]);
    }

    setLoading(false);
  }

  async function markAsRead(id: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", u.user.id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAllAsRead() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", u.user.id)
      .eq("read", false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={wrap}>
      <section style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 40, fontWeight: 900, margin: 0 }}>Notifications</h1>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={load} style={btn}>Refresh</button>
            <button onClick={markAllAsRead} style={btn}>Mark all as read</button>
          </div>
        </div>

        {errorMsg ? (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(255,80,80,0.5)", background: "rgba(255,80,80,0.12)" }}>
            <div style={{ fontWeight: 900 }}>Error</div>
            <div style={{ opacity: 0.85, marginTop: 6 }}>{errorMsg}</div>
          </div>
        ) : null}

        {loading ? (
          <div style={{ marginTop: 14, padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.22)" }}>
            Loading…
          </div>
        ) : !items.length ? (
          <div style={{ marginTop: 14, opacity: 0.85 }}>You have no notifications.</div>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {items.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.22)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{n.title}</div>
                    {n.body ? <div style={{ opacity: 0.9, marginTop: 8, whiteSpace: "pre-wrap" }}>{n.body}</div> : null}
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                      {new Date(n.created_at).toLocaleString()} • {n.read ? "Read" : "Unread"}
                    </div>
                  </div>

                  {!n.read ? (
                    <button onClick={() => markAsRead(n.id)} style={btn}>
                      Mark as read
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
