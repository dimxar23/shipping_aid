"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Forum = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
};

type Question = {
  id: string;
  title: string;
  body: string | null;
  user_id: string;
  forum_id: string;
  created_at: string;
  is_closed?: boolean;
};

type AnswerLite = {
  question_id: string;
  user_id: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

function shortId(id: string) {
  return id ? id.slice(0, 8) : "";
}
function nameOf(id: string, usernames: Record<string, string>) {
  return usernames[id] || `user_${shortId(id)}`;
}
function previewText(s: string | null, max = 90) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "—";
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

export default function ForumQuestionsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const slug = params?.id;

  const [forum, setForum] = useState<Forum | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [replyCount, setReplyCount] = useState<Record<string, number>>({});
  const [lastActivity, setLastActivity] = useState<
    Record<string, { at: string; by: string }>
  >({});

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadUsernames(userIds: string[]) {
    const uniq = Array.from(new Set(userIds)).filter(Boolean);
    if (uniq.length === 0) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", uniq)
      .returns<ProfileRow[]>();

    if (error || !data) return;

    const map: Record<string, string> = {};
    for (const p of data) {
      map[p.id] = p.username?.trim() || `user_${shortId(p.id)}`;
    }
    setUsernames((prev) => ({ ...prev, ...map }));
  }

  async function load() {
    if (!slug) return;

    setLoading(true);
    setErrorMsg(null);

    const { data: f, error: fErr } = await supabase
      .from("forums")
      .select("id, slug, title, description")
      .eq("slug", slug)
      .maybeSingle<Forum>();

    if (fErr || !f) {
      setForum(null);
      setQuestions([]);
      setErrorMsg(fErr?.message || "Forum not found.");
      setLoading(false);
      return;
    }

    setForum(f);

    const { data: qs, error: qErr } = await supabase
      .from("questions")
      .select("id, title, body, user_id, forum_id, created_at, is_closed")
      .eq("forum_id", f.id)
      .order("created_at", { ascending: false });

    if (qErr) {
      setQuestions([]);
      setErrorMsg(qErr.message);
      setLoading(false);
      return;
    }

    const qList = (qs || []) as Question[];
    setQuestions(qList);

    if (qList.length === 0) {
      setReplyCount({});
      setLastActivity({});
      setLoading(false);
      return;
    }

    const qIds = qList.map((x) => x.id);

    const { data: aData, error: aErr } = await supabase
      .from("answers")
      .select("question_id, user_id, created_at")
      .in("question_id", qIds)
      .order("created_at", { ascending: true });

    const answers = (!aErr && aData ? (aData as AnswerLite[]) : []) || [];

    const counts: Record<string, number> = {};
    const last: Record<string, { at: string; by: string }> = {};

    for (const q of qList) {
      counts[q.id] = 0;
      last[q.id] = { at: q.created_at, by: q.user_id };
    }
    for (const a of answers) {
      counts[a.question_id] = (counts[a.question_id] || 0) + 1;
      last[a.question_id] = { at: a.created_at, by: a.user_id };
    }

    setReplyCount(counts);
    setLastActivity(last);

    const needUsers = [
      ...qList.map((x) => x.user_id),
      ...Object.values(last).map((x) => x.by),
    ];
    await loadUsernames(needUsers);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const containerStyle: React.CSSProperties = {
    maxWidth: 1100,
    margin: "0 auto",
    padding: 16,
  };

  const glassStyle: React.CSSProperties = {
    padding: 20,
    marginTop: 14,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.28)",
  };

  const tableWrap: React.CSSProperties = {
    marginTop: 14,
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.22)",
  };

  const headerRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "10px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    fontSize: 12,
    opacity: 0.8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    textDecoration: "none",
    color: "inherit",
  };

  const bulletStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.65)",
    flex: "0 0 auto",
  };

  const topicCol: React.CSSProperties = {
    flex: "1 1 auto",
    minWidth: 0,
  };

  const repliesCol: React.CSSProperties = {
    width: 120,
    textAlign: "right",
    flex: "0 0 auto",
  };

  const lastCol: React.CSSProperties = {
    width: 240,
    textAlign: "right",
    flex: "0 0 auto",
  };

  const titleLine: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.25)",
    opacity: 0.9,
    flex: "0 0 auto",
  };

  const subText: React.CSSProperties = {
    fontSize: 13,
    opacity: 0.75,
    marginTop: 4,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };

  const byLine: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.75,
    marginTop: 4,
  };

  const userLinkStyle: React.CSSProperties = {
    textDecoration: "underline",
    textUnderlineOffset: 3,
    color: "inherit",
    opacity: 0.95,
  };

  return (
    <main style={containerStyle}>
      <section style={glassStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 34, fontWeight: 900, margin: 0 }}>
              {forum?.title ?? "Forum"}
            </h1>
            <div style={{ opacity: 0.85, marginTop: 6 }}>
              {forum?.description ?? ""}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => router.push(`/ask?forum=${encodeURIComponent(String(slug))}`)}>
              New
            </button>
            <button onClick={load}>Refresh</button>
          </div>
        </div>

        {errorMsg ? (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: "1px solid rgba(255,80,80,0.5)", background: "rgba(255,80,80,0.12)" }}>
            {errorMsg}
          </div>
        ) : null}

        {loading ? (
          <div style={{ marginTop: 14, padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.22)" }}>
            Loading…
          </div>
        ) : questions.length === 0 ? (
          <div style={{ marginTop: 14, padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.22)" }}>
            No questions yet.
          </div>
        ) : (
          <div style={tableWrap}>
            <div style={headerRow}>
              <div style={{ flex: "1 1 auto" }}>Topic</div>
              <div style={{ width: 120, textAlign: "right" }}>Replies</div>
              <div style={{ width: 240, textAlign: "right" }}>Last activity</div>
            </div>

            {questions.map((q, idx) => {
              const author = nameOf(q.user_id, usernames);
              const replies = replyCount[q.id] ?? 0;
              const last = lastActivity[q.id] || { at: q.created_at, by: q.user_id };
              const lastBy = nameOf(last.by, usernames);
              const lastAt = new Date(last.at).toLocaleString();

              return (
                <Link
                  key={q.id}
                  href={`/questions/${q.id}`}
                  style={{
                    ...rowStyle,
                    borderBottom: idx === questions.length - 1 ? "none" : rowStyle.borderBottom,
                  }}
                >
                  <div style={bulletStyle} />

                  <div style={topicCol}>
                    <div style={titleLine}>
                      <div style={titleStyle}>{q.title}</div>
                      {q.is_closed ? <span style={badgeStyle}>Closed</span> : null}
                    </div>

                    <div style={subText}>{previewText(q.body, 110)}</div>

                    <div style={byLine}>
                      by{" "}
                      <Link href={`/messages?to=${q.user_id}`} style={userLinkStyle} onClick={(e) => e.stopPropagation()}>
                        {author}
                      </Link>
                    </div>
                  </div>

                  <div style={repliesCol}>
                    <div style={{ fontWeight: 800 }}>{replies}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>replies</div>
                  </div>

                  <div style={lastCol}>
                    <Link
                      href={`/messages?to=${last.by}`}
                      style={{ ...userLinkStyle, fontWeight: 800, display: "inline-block", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lastBy}
                    </Link>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{lastAt}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
