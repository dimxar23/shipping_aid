"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null; // public path like "/avatars/a1.png"
  age: number | null;
  gender: string | null;
  specialty: string | null;
  personnel_type: string | null; // "sea" | "shore" | null
  bio: string | null;
};

function normalizeUsername(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

const AVATAR_CHOICES = [
  { id: "a1", src: "/avatars/a1.png", label: "Avatar 1" },
  { id: "a2", src: "/avatars/a2.png", label: "Avatar 2" },
  { id: "a3", src: "/avatars/a3.png", label: "Avatar 3" },
  { id: "a4", src: "/avatars/a4.png", label: "Avatar 4" },
  { id: "a5", src: "/avatars/a5.png", label: "Avatar 5" },
  { id: "a6", src: "/avatars/a6.png", label: "Avatar 6" },
];

export default function ProfileSettingsPage() {
  const router = useRouter();

  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [row, setRow] = useState<ProfileRow | null>(null);

  const [username, setUsername] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);

  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("");
  const [personnelType, setPersonnelType] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const isDirty = useMemo(() => {
    if (!row) return false;
    return (
      username !== (row.username ?? "") ||
      (avatarPath ?? "") !== (row.avatar_url ?? "") ||
      (age ? age : "") !== (row.age == null ? "" : String(row.age)) ||
      gender !== (row.gender ?? "") ||
      specialty !== (row.specialty ?? "") ||
      personnelType !== (row.personnel_type ?? "") ||
      bio !== (row.bio ?? "")
    );
  }, [row, username, avatarPath, age, gender, specialty, personnelType, bio]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setMsg("");

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login?next=/settings/profile");
        return;
      }

      setMeId(data.user.id);
      await loadProfile(data.user.id);
      setLoading(false);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string) {
    setMsg("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,avatar_url,age,gender,specialty,personnel_type,bio")
      .eq("id", userId)
      .limit(1);

    if (error) {
      setMsg(error.message);
      setRow(null);
      return;
    }

    const p = (data ?? [])[0] as ProfileRow | undefined;
    if (!p) {
      setMsg("Profile row not found.");
      setRow(null);
      return;
    }

    setRow(p);

    setUsername(p.username ?? "");
    setAvatarPath(p.avatar_url ?? null);

    setAge(p.age == null ? "" : String(p.age));
    setGender(p.gender ?? "");
    setSpecialty(p.specialty ?? "");
    setPersonnelType(p.personnel_type ?? "");
    setBio(p.bio ?? "");
  }

  async function usernameIsTaken(cleanUsername: string) {
    if (!meId) return false;
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", cleanUsername)
      .neq("id", meId)
      .limit(1);

    if (error) return false;
    return (data || []).length > 0;
  }

  async function save() {
    if (!meId) return;

    setSaving(true);
    setMsg("");

    try {
      const cleanUsername = normalizeUsername(username);
      if (!cleanUsername || cleanUsername.length < 3) {
        setMsg("Username must be at least 3 characters (letters/numbers/underscore).");
        setSaving(false);
        return;
      }

      const taken = await usernameIsTaken(cleanUsername);
      if (taken) {
        setMsg("That username is already taken. Please choose another one.");
        setSaving(false);
        return;
      }

      const ageNum =
        age.trim() === ""
          ? null
          : Number.isFinite(Number(age))
          ? Math.max(0, Math.min(120, Number(age)))
          : null;

      const payload: Partial<ProfileRow> = {
        username: cleanUsername,
        avatar_url: avatarPath ?? null,
        age: ageNum,
        gender: gender.trim() ? gender.trim().slice(0, 32) : null,
        specialty: specialty.trim() ? specialty.trim().slice(0, 80) : null,
        personnel_type: personnelType.trim() ? personnelType.trim() : null,
        bio: bio.trim() ? bio.trim().slice(0, 500) : null,
      };

      const { error } = await supabase.from("profiles").update(payload).eq("id", meId);

      if (error) {
        const nice =
          (error as any)?.code === "23505"
            ? "That username is already taken. Please choose another one."
            : error.message;
        throw new Error(nice);
      }

      setMsg("Saved ✅");
      await loadProfile(meId);
    } catch (e: any) {
      setMsg(e?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 920, margin: "60px auto", padding: 16 }}>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 920, margin: "60px auto", padding: 16 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Profile Settings</h1>
          <p style={{ opacity: 0.8, marginTop: 8 }}>
            Your forum posts will show your <b>username</b> (not your email).
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/")}>Back</button>
          <button onClick={save} disabled={!isDirty || saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      {msg ? (
        <p style={{ marginTop: 14, padding: 10, border: "1px solid rgba(255,255,255,0.18)", borderRadius: 12 }}>
          {msg}
        </p>
      ) : null}

      <section className="glass" style={{ marginTop: 18, padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Public profile</h2>

        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.22)",
                overflow: "hidden",
                background: "rgba(0,0,0,0.25)",
              }}
            >
              {avatarPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPath} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontWeight: 900 }}>
                  {username ? username.slice(0, 2).toUpperCase() : "U"}
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, opacity: 0.8 }}>Choose an avatar</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {AVATAR_CHOICES.map((a) => {
                const active = avatarPath === a.src;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAvatarPath(a.src)}
                    style={{
                      borderRadius: 12,
                      border: active ? "2px solid rgba(255,255,255,0.75)" : "1px solid rgba(255,255,255,0.18)",
                      padding: 6,
                      background: active ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.18)",
                      cursor: "pointer",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.src} alt={a.label} style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 10, objectFit: "cover" }} />
                  </button>
                );
              })}
            </div>

            <button type="button" onClick={() => setAvatarPath(null)} style={{ marginTop: 8, opacity: 0.85 }}>
              Remove avatar
            </button>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Username *</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. chief_engineer_12" style={{ padding: 12, borderRadius: 12, width: "100%" }} />
              <span style={{ fontSize: 12, opacity: 0.75 }}>Allowed: letters, numbers, underscore.</span>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 800 }}>Personnel type (optional)</span>
                <select value={personnelType} onChange={(e) => setPersonnelType(e.target.value)} style={{ padding: 12, borderRadius: 12, width: "100%" }}>
                  <option value="">Prefer not to say</option>
                  <option value="sea">Sea Personnel (Seafarer)</option>
                  <option value="shore">Shore Personnel</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 800 }}>Specialty / Role (optional)</span>
                <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Chief Engineer, Master, Superintendent…" style={{ padding: 12, borderRadius: 12, width: "100%" }} />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="glass" style={{ marginTop: 14, padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Optional info</h2>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Age (optional)</span>
              <input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" placeholder="e.g. 35" style={{ padding: 12, borderRadius: 12, width: "100%" }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 800 }}>Gender (optional)</span>
              <input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="e.g. Male / Female / Prefer not to say" style={{ padding: 12, borderRadius: 12, width: "100%" }} />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 800 }}>Bio (optional)</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={6} placeholder="A short description (optional)…" style={{ padding: 12, borderRadius: 12, width: "100%", resize: "vertical" }} />
            <span style={{ fontSize: 12, opacity: 0.75 }}>Max 500 characters.</span>
          </label>
        </div>
      </section>
    </main>
  );
}
