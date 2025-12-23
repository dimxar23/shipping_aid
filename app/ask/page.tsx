// app/ask/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type ForumRow = {
  id: string;
  slug: string;
  title: string;
};

function normalizeForumSlug(raw: string | null) {
  // υποστηρίζουμε και παλιά values (sea/shore)
  if (raw === "shore" || raw === "shore-personnel") return "shore-personnel";
  if (raw === "sea" || raw === "sea-personnel") return "sea-personnel";
  // default
  return "sea-personnel";
}

// ✅ Το κομμάτι που χρησιμοποιεί useSearchParams μπαίνει σε component μέσα σε Suspense
function AskPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const forumSlug = normalizeForumSlug(searchParams.get("forum"));

  const [meId, setMeId] = useState<string | null>(null);
  const [forum, setForum] = useState<ForumRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // user
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push(`/login?next=/ask?forum=${forumSlug}`);
        return;
      }
      if (cancelled) return;
      setMeId(data.user.id);

      // forum
      const { data: f, error: fErr } = await supabase
        .from("forums")
        .select("id, slug, title")
        .eq("slug", forumSlug)
        .maybeSingle<ForumRow>();

      if (cancelled) return;

      if (fErr || !f) {
        setError(fErr?.message || "Forum not found.");
        setLoading(false);
        return;
      }

      setForum(f);
      setLoading(false);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [router, forumSlug]);

  async function submit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!meId || !forum) return;

    setSubmitting(true);
    setError("");

    const { error } = await supabase.from("questions").insert({
      title: title.trim(),
      body: body.trim(),
      user_id: meId,
      forum_id: forum.id, // ✅ UUID
    });

    if (error) {
      setSubmitting(false);
      setError(error.message ?? "Something went wrong.");
      return;
    }

    setSubmitting(false);
    // ✅ επιστροφή στη λίστα του forum
    router.push(`/q/${forum.slug}`);
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 720, margin: "60px auto", padding: 16 }}>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
        Ask a question
      </h1>

      <p style={{ opacity: 0.85, marginBottom: 20 }}>
        Forum:{" "}
        <b>
          {forum?.title ||
            (forumSlug === "sea-personnel"
              ? "Topics related to Sea Personnel"
              : "Topics related to Shore Personnel")}
        </b>
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Question title"
          style={{ padding: 10 }}
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe your problem or question (optional)"
          rows={6}
          style={{ padding: 10 }}
        />

        {error ? <p style={{ color: "red", fontSize: 13 }}>{error}</p> : null}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={submit} disabled={submitting}>
            {submitting ? "Posting…" : "Post question"}
          </button>

          <button onClick={() => router.push(`/q/${forumSlug}`)}>Cancel</button>
        </div>
      </div>
    </main>
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <main style={{ maxWidth: 720, margin: "60px auto", padding: 16 }}>
          <p>Loading…</p>
        </main>
      }
    >
      <AskPageInner />
    </Suspense>
  );
}
