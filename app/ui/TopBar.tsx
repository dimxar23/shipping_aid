"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type ProfileLite = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

function shortId(id: string) {
  return id ? id.slice(0, 8) : "";
}

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();

  const [label, setLabel] = useState<string>("…");
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle<ProfileLite>();

      const username = p?.username?.trim();
      setLabel(username || `user_${shortId(user.id)}`);
      setAvatar(p?.avatar_url ?? null);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  const btn = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 12,
    border: active ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.15)",
    background: active ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.18)",
    cursor: "pointer",
    fontWeight: 700,
  });

  return (
    <header
      className="topbar"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.25)",
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
          }}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span>⚓</span>
          )}
        </div>

        <div>
          <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>
            Shipping Aid – Community
          </div>
          <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>✅ Signed in as {label}</div>
        </div>
      </div>

      <nav style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button style={btn(pathname === "/")} onClick={() => router.push("/")}>
          Home
        </button>

        <button style={btn(pathname.startsWith("/settings/profile"))} onClick={() => router.push("/settings/profile")}>
          Profile
        </button>

        <button style={btn(pathname.startsWith("/messages"))} onClick={() => router.push("/messages")}>
          Messages
        </button>

        <button style={btn(pathname.startsWith("/notifications"))} onClick={() => router.push("/notifications")}>
          Notifications
        </button>

        <button style={btn(false)} onClick={logout}>
          Logout
        </button>
      </nav>
    </header>
  );
}
