// components/PostCard.jsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import s from "@/styles/PostCard.module.css";

export default function PostCard({ post }) {
  const router = useRouter();

  // Normalize ids safely (string or ObjectId-like)
  const postId = useMemo(() => post.id || post._id?.$oid || post._id, [post]);
  const authorId = useMemo(() => post.authorId || post.userId || null, [post]);

  // Like state (UI uses only state, not raw post.likeCount)
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(post.likeCount ?? 0);
  const [loading, setLoading] = useState(false);

  // Prefetch detail page for snappier nav (optional)
  useEffect(() => {
    if (postId) router.prefetch?.(`/posts/${postId}`);
  }, [router, postId]);

  // Fetch initial like state (if signed-in)
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token || !postId) return;

    fetch(`/api/posts/${postId}/like`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (typeof data.liked === "boolean") setLiked(data.liked);
        if (typeof data.likeCount === "number") setCount(data.likeCount);
      })
      .catch(() => {});
  }, [postId]);

  // Navigate to detail unless user clicked an interactive control
  const handleCardClick = (e) => {
    if (e.target.closest("a,button,svg,[role='button']")) return;
    if (!postId) return;
    router.push(`/posts/${postId}`);
  };

  // Toggle like with optimistic UI
  const toggleLike = async (e) => {
    e.stopPropagation();
    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) {
      router.push("/login");
      return;
    }
    if (!postId || loading) return;

    setLoading(true);
    const prevLiked = liked;
    const prevCount = count;

    // Optimistic update
    setLiked(!prevLiked);
    setCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const r = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("toggle failed");
      const data = await r.json();
      if (typeof data.liked === "boolean") setLiked(data.liked);
      if (typeof data.likeCount === "number") setCount(data.likeCount);
    } catch {
      // Revert on error
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setLoading(false);
    }
  };

  const Badge = ({ children, title }) => (
    <span className={s.badge} title={title}>
      {children}
    </span>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open post ${post.title || ""}`}
      className={s.card}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleCardClick(e);
      }}
    >

      
      {/* Title */}
      <h3 className={s.title}>{post.title}</h3>

      {/* Meta badges */}
      <div className={s.metaRow}>
        {post.difficulty && <Badge title="Difficulty">{post.difficulty}</Badge>}
        {Number.isFinite(post.timeMax) && (
          <Badge title="Max time">{post.timeMax} min</Badge>
        )}
        {post.dietary && <Badge title="Dietary">{post.dietary}</Badge>}
      </div>

      {/* Image */}
      {post.photo && (
        <img
          className={s.image}
          src={post.photo}
          alt={post.title || "Post image"}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Excerpt */}
      <p className={s.excerpt}>
        {(post.excerpt ?? post.content ?? "").toString().slice(0, 140)}
        {((post.content?.length ?? 0) > 140 ? "..." : "")}
      </p>

      {/* Actions row */}
      <div className={s.actions}>
        {postId ? (
          <Link href={`/posts/${postId}`} onClick={(e) => e.stopPropagation()}>
            View
          </Link>
        ) : (
          <span className={s.muted}>View</span>
        )}

        {authorId ? (
          <Link
            href={`/users/${authorId}`}
            onClick={(e) => e.stopPropagation()}
            title="Open author profile"
          >
            Author
          </Link>
        ) : (
          <span className={s.muted} title="Author not available">
            Author
          </span>
        )}

        <span className={s.spacer} />

        <button
          onClick={toggleLike}
          aria-label={liked ? "Unlike" : "Like"}
          disabled={loading}
          className={`${s.likeBtn} ${liked ? s.liked : ""}`}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-8.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
          </svg>
          <span>{count}</span>
        </button>
      </div>
    </div>
  );
}