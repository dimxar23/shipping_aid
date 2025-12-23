"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type QuestionRow = {
  id: string;
  title: string;
  body: string | null;
  user_id: string;
  forum_id: string | null;
  created_at: string;
  updated_at: string | null;
  is_closed: boolean;
  closed_at: string | null;
};

type ForumRow = {
  id: string;
  slug: string;
  title: string;
};

type AnswerRow = {
  id: string;
  body: string;
  user_id: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string | null;
};

function shortId(id: string) {
  return id ? id.slice(0, 8) : "";
}

function displayName(id: string, profiles: Record<string, string>) {
  return profiles[id] || `user_${shortId(id)}`;
}

function avatarLetter(name: string) {
  const t = (name || "").trim();
  return (t ? t[0] : "U").toUpperCase();
}

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

export default function QuestionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const questionId = params?.id;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [meId, setMeId] = useState<string | null>(null);

  const [q, setQ] = useState<QuestionRow | null>(null);
  const [forum, setForum] = useState<ForumRow | null>(null);

  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  // Reply
  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Owner edit
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  const isOwner = useMemo(() => !!(meId && q && meId === q.user_id), [meId, q]);
  const isClosed = !!q?.is_closed;

  const canReply = useMemo(() => {
    return !!meId && !!q && !isClosed && reply.trim().length > 0 && !posting;
  }, [meId, q, isClosed, reply, posting]);

  async function loadProfiles(userIds: string[]) {
    const uniq = Array.from(new Set(userIds)).filter(Boolean);
    if (uniq.length === 0) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", uniq)
      .returns<ProfileRow[]>();

    if (error || !data) return;

    const map: Record<string, string> = {};
    for (const p of data) {
      map[p.id] = p.username?.trim() || `user_${shortId(p.id)}`;
    }
    setProfiles((prev) => ({ ...prev, ...map }));
  }

  async function load() {
    if (!questionId) return;

    setLoading(true);
    setErrorMsg(null);

    // who am I
    const { data: u } = await supabase.auth.getUser();
    setMeId(u.user?.id ?? null);

    // question
    const { data: qData, error: qErr } = await supabase
      .from("questions")
      .select(
        "id, title, body, user_id, forum_id, created_at, updated_at, is_closed, closed_at"
      )
      .eq("id", questionId)
      .maybeSingle<QuestionRow>();

    if (qErr || !qData) {
      setQ(null);
      setForum(null);
      setAnswers([]);
      setErrorMsg(qErr?.message || "Question not found.");
      setLoading(false);
      return;
    }

    setQ(qData);
    setEditTitle(qData.title || "");
    setEditBody(qData.body || "");

    // forum for back button
    if (qData.forum_id) {
      const { data: fData } = await supabase
        .from("forums")
        .select("id, slug, title")
        .eq("id", qData.forum_id)
        .maybeSingle<ForumRow>();
      setForum(fData || null);
    } else {
      setForum(null);
    }

    // answers
    const { data: aData, error: aErr } = await supabase
      .from("answers")
      .select("id, body, user_id, created_at")
      .eq("question_id", questionId)
      .order("created_at", { ascending: true });

    if (aErr) {
      setAnswers([]);
    } else {
      const list = ((aData || []) as AnswerRow[]) || [];
      setAnswers(list);
      await loadProfiles([qData.user_id, ...list.map((x) => x.user_id)]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  async function postReply() {
    if (!meId || !q) return;

    setPosting(true);
    setReplyError(null);

    const text = reply.trim();
    if (!text) {
      setPosting(false);
      return;
    }

    const { error } = await supabase.from("answers").insert({
      question_id: q.id,
      user_id: meId,
      body: text,
    });

    if (error) {
      setReplyError(error.message);
      setPosting(false);
      return;
    }

    setReply("");
    setPosting(false);
    await load();
  }

  async function saveQuestionEdits() {
    if (!q) return;

    setOwnerError(null);
    setSavingEdit(true);

    const t = editTitle.trim();
    if (!t) {
      setOwnerError("Title is required.");
      setSavingEdit(false);
      return;
    }

    const { error } = await supabase
      .from("questions")
      .update({
        title: t,
        body: editBody.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", q.id);

    if (error) {
      setOwnerError(error.message);
      setSavingEdit(false);
      return;
    }

    setSavingEdit(false);
    setEditing(false);
    await load();
  }

  async function closeQuestion() {
    if (!q) return;

    setOwnerError(null);

    const ok = window.confirm(
      "Close this question? After closing, nobody can post new answers."
    );
    if (!ok) return;

    const { error } = await supabase
      .from("questions")
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", q.id);

    if (error) {
      setOwnerError(error.message);
      return;
    }

    await load();
  }

  async function deleteQuestion() {
    if (!q) return;

    setOwnerError(null);

    const ok = window.confirm(
      "Delete this question? This will also delete all answers."
    );
    if (!ok) return;

    const { error } = await supabase.from("questions").delete().eq("id", q.id);

    if (error) {
      setOwnerError(error.message);
      return;
    }

    if (forum) router.push(`/q/${forum.slug}`);
    else router.push("/");
  }

  // ---------------- UI states ----------------

  if (loading) {
    return (
      <div className="thread">
        <section className="glass" style={{ padding: 18 }}>
          Loading…
        </section>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="thread">
        <section
          className="glass"
          style={{
            padding: 18,
            borderColor: "rgba(255,80,80,0.5)",
            background: "rgba(255,80,80,0.10)",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18 }}>Error</div>
          <div style={{ marginTop: 8, color: "var(--muted)" }}>{errorMsg}</div>

          <div style={{ marginTop: 14 }}>
            <button onClick={() => router.back()}>Back</button>
          </div>
        </section>
      </div>
    );
  }

  if (!q) return null;

  const ownerName = displayName(q.user_id, profiles);

  return (
    <div className="thread">
      {/* Header */}
      <section className="glass thread-header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <h1 className="thread-title">{q.title}</h1>
              <span className="badge">{q.is_closed ? "Closed" : "Open"}</span>
            </div>

            <div className="thread-meta">
              <span>{fmt(q.created_at)}</span>
              <span>•</span>
              <span>
                by <b style={{ color: "var(--text)" }}>{ownerName}</b>
              </span>

              {forum ? (
                <>
                  <span>•</span>
                  <span>
                    Forum: <b style={{ color: "var(--text)" }}>{forum.title}</b>
                  </span>
                </>
              ) : null}

              {q.closed_at ? (
                <>
                  <span>•</span>
                  <span>
                    Closed:{" "}
                    <b style={{ color: "var(--text)" }}>{fmt(q.closed_at)}</b>
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <div className="thread-actions">
            {forum ? (
              <button onClick={() => router.push(`/q/${forum.slug}`)}>
                Back to forum
              </button>
            ) : (
              <button onClick={() => router.back()}>Back</button>
            )}
          </div>
        </div>
      </section>

      {/* Owner controls */}
      {isOwner ? (
        <section className="glass" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>
            Owner controls
          </div>

          {ownerError ? (
            <div
              style={{
                marginBottom: 10,
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(255,80,80,0.5)",
                background: "rgba(255,80,80,0.12)",
              }}
            >
              {ownerError}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!editing ? (
              <button onClick={() => setEditing(true)}>Edit</button>
            ) : (
              <>
                <button onClick={saveQuestionEdits} disabled={savingEdit}>
                  {savingEdit ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditTitle(q.title || "");
                    setEditBody(q.body || "");
                    setOwnerError(null);
                  }}
                >
                  Cancel
                </button>
              </>
            )}

            {!q.is_closed ? <button onClick={closeQuestion}>Close</button> : null}

            <button
              onClick={deleteQuestion}
              style={{
                borderColor: "rgba(255,80,80,0.55)",
                background: "rgba(255,80,80,0.10)",
              }}
            >
              Delete
            </button>
          </div>

          {editing ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Title"
              />
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Body"
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Question post */}
      <section className="glass post">
        <aside className="post-left">
          <div className="userbox">
            <div className="avatar">{avatarLetter(ownerName)}</div>
            <div className="username">{ownerName}</div>
            <div className="usermeta">Topic starter</div>
          </div>
        </aside>

        <div className="post-right">
          <div className="post-top">
            <div style={{ fontWeight: 900 }}>Question</div>
            <div className="post-date">{fmt(q.created_at)}</div>
          </div>

          <div className="post-body">{q.body?.trim() ? q.body : "—"}</div>
        </div>
      </section>

      {/* Answers */}
      <section className="glass" style={{ padding: 16 }}>
        <div className="section-title">Answers</div>

        {answers.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No answers yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {answers.map((a, idx) => {
              const name = displayName(a.user_id, profiles);
              return (
                <div
                  key={a.id}
                  className="glass post"
                  style={{
                    boxShadow: "none",
                    background: "var(--glass-bg-strong)",
                  }}
                >
                  <aside className="post-left">
                    <div className="userbox">
                      <div className="avatar">{avatarLetter(name)}</div>
                      <div className="username">{name}</div>
                      <div className="usermeta">Reply #{idx + 1}</div>
                    </div>
                  </aside>

                  <div className="post-right">
                    <div className="post-top">
                      <div style={{ fontWeight: 900 }}>Reply</div>
                      <div className="post-date">{fmt(a.created_at)}</div>
                    </div>

                    <div className="post-body">{a.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Reply */}
      <section className="glass reply-box" style={{ padding: 16 }}>
        <div className="section-title">Your reply</div>

        {!meId ? (
          <div style={{ color: "var(--muted)" }}>
            <div style={{ marginBottom: 10 }}>Sign in to reply.</div>
            <button onClick={() => router.push(`/login?next=/questions/${q.id}`)}>
              Sign in
            </button>
          </div>
        ) : q.is_closed ? (
          <div style={{ color: "var(--muted)" }}>
            This question is <b>closed</b>. New answers are not allowed.
          </div>
        ) : (
          <>
            {replyError ? (
              <div
                style={{
                  marginBottom: 10,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,80,80,0.5)",
                  background: "rgba(255,80,80,0.12)",
                }}
              >
                {replyError}
              </div>
            ) : null}

            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write your answer…"
            />

            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={postReply} disabled={!canReply}>
                {posting ? "Posting…" : "Post answer"}
              </button>
              <button onClick={() => setReply("")}>Clear</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
