// pages/posts/[postId].jsx
import Link from "next/link";
import { useRouter } from "next/router";
import CommentSection from "@/components/CommentSection";
import { useEffect, useState } from "react";

export default function PostPage({ post, notFound }) {
  const postId = post?.id;
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) return;

    fetch(`/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        setCurrentUser(data);
        if (data && post?.authorId && String(data.id) === String(post.authorId)) {
          setIsOwner(true);
        }
      })
      .catch(() => {});
  }, [post]);

  if (notFound || !post) {
    return (
      <div style={{ padding: 24 }}>
        <p>Post not found.</p>
        <Link href="/">← Back</Link>
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = window.confirm("Are you sure you want to delete this post? This action cannot be undone.");
    if (!ok) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    try {
      const resp = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        alert("Post deleted");
        router.push("/");
      } else {
        const data = await resp.json();
        alert(data.message || "Failed to delete post");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete post. Please try again.");
    }
  };

  return (
    <div style={{ maxWidth: 820, margin: "72px auto", padding: "0 16px" }}>
      <Link href="/">← Back</Link>

      <h1 style={{ margin: "16px 0 8px" }}>{post.title}</h1>

      {post.createdAt && (
        <p style={{ color: "#666", marginTop: 0 }}>
          {new Date(post.createdAt).toLocaleString()}
        </p>
      )}

      {post.photo && (
        <img
          src={post.photo}
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

      {/* Owner actions */}
      {isOwner && (
        <div style={{ marginTop: 12 }}>
          <button onClick={handleDelete} style={{ background: '#e53e3e', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 6 }}>
            Delete Post
          </button>
        </div>
      )}

      {/* --- COMMENT section --- */}
      <hr style={{ margin: "40px 0", borderTop: "1px solid #ddd" }} />

      <section className="comments-section">
        <h2 style={{ marginBottom: 20 }}>Comments</h2>
        {postId && <CommentSection recipeId={postId} />}
      </section>
    </div>
  );
}

export async function getServerSideProps({ params, req }) {
  const base = `http://${req?.headers?.host || "localhost:3000"}`;
  try {
    const r = await fetch(`${base}/api/posts/${params.postId}`);
    if (!r.ok) return { props: { notFound: true } };
    const post = await r.json();
    return { props: { post } };
  } catch {
    return { props: { notFound: true } };
  }
}
