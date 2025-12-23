// app/f/[slug]/page.tsx
import Link from "next/link";

const SUBJECTS: Record<
  string,
  { title: string; description: string }
> = {
  "sea-personnel": {
    title: "Topics related to Sea Personnel",
    description:
      "Problems and questions from Chief Engineers, 2nd Engineers, Masters, Chief Officers, 2nd Officers, and other seafarers.",
  },
  "shore-personnel": {
    title: "Topics related to Shore Personnel",
    description:
      "Problems and questions from Superintendents, Technical Officers, IT Officers, and other shore-based personnel.",
  },
};

export default async function ForumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const subject = SUBJECTS[slug];

  if (!subject) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Forum not found</h1>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>{subject.title}</h1>
      <p style={{ opacity: 0.9, marginBottom: 16 }}>{subject.description}</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        <Link
          href={`/ask?forum=${slug}`}
          style={{
            border: "1px solid #333",
            borderRadius: 10,
            padding: "10px 12px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Ask a question
        </Link>

        <Link
          href="/"
          style={{
            border: "1px solid #333",
            borderRadius: 10,
            padding: "10px 12px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Back
        </Link>
      </div>

      <p style={{ opacity: 0.8 }}>
        Next step: show questions for this subject (from Supabase).
      </p>
    </main>
  );
}
