// pages/posts/[postId].jsx
import Link from "next/link";
import CommentSection from "@/components/CommentSection";
import api from "@/utils/api";
import { useState, useEffect } from "react";

export default function PostPage({ post, notFound, postIdFromProps }) {
  const postId = post?.id;
  const [isFavorited, setIsFavorited] = useState(false);

  if (notFound || !post) {
    return (
      <div style={{ padding: 24 }}>
        <p>Post not found.</p>
        <Link href="/">← Back</Link>
      </div>
    );
  }

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;

    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      if (userInfo) {
        setCurrentUser(userInfo);
      }
    } catch (error) {
      console.error("Failed to parse user info:", error);
    }
  }, []);

  useEffect(() => {
    const checkFavorite = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) {
        return;
      }

      try {
        const res = await api.get(`posts/${postIdFromProps}/isFavorite`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsFavorited(res.data.isFavorited);
      } catch (error) {
        console.error("Failed to get favorite post ", error);
      }
    };
    checkFavorite();
  }, [postIdFromProps]);

  const handleSaveButton = async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      return;
    }

    try {
      const res = await api.post(`posts/${postIdFromProps}/favorite`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsFavorited(res.data.isFavorited);
    } catch (error) {
      console.log("Failed to handle save button ", error);
    }
  };

  return (
    <div style={{ maxWidth: 820, margin: "72px auto", padding: "0 16px" }}>
      <Link href="/">← Back</Link>

      <h1 style={{ margin: "16px 0 8px" }}>{post.title}</h1>

      {post.createdAt && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <p style={{ color: "#666", marginTop: 0 }}>
            {new Date(post.createdAt).toLocaleString()}
          </p>
          <button
            onClick={handleSaveButton}
            style={{
              padding: "8px 16px",
              fontSize: 16,
              border: "1px solid #333",
              borderRadius: 4,
              backgroundColor: isFavorited ? "#333" : "#fff",
              color: isFavorited ? "#fff" : "#333",
              cursor: "pointer",
              fontWeight: isFavorited ? "bold" : "normal",
            }}
          >
            {isFavorited ? "Saved" : "Save"}
          </button>
        </div>
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

      {/* --- COMMENT section --- */}
      <hr style={{ margin: "40px 0", borderTop: "1px solid #ddd" }} />

      <section className="comments-section">
        <h2 style={{ marginBottom: 20 }}>Comments</h2>
        {postId && <CommentSection postId={postId} />}
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
    return { props: { post, postIdFromProps: params.postId } };
  } catch {
    return { props: { notFound: true } };
  }
}
