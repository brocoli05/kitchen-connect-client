// pages/posts/[postId].jsx
import Link from "next/link";

export default function PostPage({ post, notFound }) {
  if (notFound) {
    return (
      <div style={{ padding: 24 }}>
        <p>Post not found.</p>
        <Link href="/">← Back</Link>
      </div>
    );
  }

  const image = post?.imageUrl || post?.photo; 

  return (
    <div style={{ maxWidth: 820, margin: "72px auto", padding: "0 16px" }}>
      <div style={{ marginBottom: 8 }}>
        {post?.authorId ? (
          <Link href={`/users/${post.authorId}`}>← {post.authorName ?? "Author"}</Link>
        ) : (
          <Link href="/">← Back</Link>
        )}
      </div>

      <h1 style={{ margin: "16px 0 8px" }}>{post.title}</h1>

      {post.createdAt && (
        <p style={{ color: "#666", marginTop: 0 }}>
          {new Date(post.createdAt).toLocaleString()}
        </p>
      )}

      {image && (
        <img
          src={image}
          alt=""
          style={{ maxWidth: "100%", borderRadius: 8, margin: "12px 0" }}
        />
      )}

      <article
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
          background: "#fafafa",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 16,
        }}
      >
        {post.content}
      </article>

      <div style={{ marginTop: 16 }}>
        <Link href="/mainpage">Back to Home</Link>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params, req }) {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `http://${req?.headers?.host || "localhost:3000"}`;

  try {
    const res = await fetch(`${base}/api/posts/${params.postId}`);
    if (!res.ok) return { props: { notFound: true } };
    const post = await res.json();
    return { props: { post } };
  } catch (e) {
    return { props: { notFound: true } };
  }
}
