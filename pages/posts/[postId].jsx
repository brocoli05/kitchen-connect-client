// pages/posts/[postId].jsx
import { useEffect, useState } from "react";
import Link from "next/link";
import PostActions from "@/components/PostActions";

export default function PostPage({ post, notFound }) {
  // handle 404 (based on result of SSR)
  if (notFound) {
    return (
      <div style={{ padding: 24 }}>
        <p>Post not found.</p>
        <Link href="/">← Back</Link>
      </div>
    );
  }

  
  const [me, setMe] = useState(null);
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        if (!ignore) setMe(data);
      } catch {}
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const isOwner = me?.id && post?.authorId && me.id === post.authorId;

  const like = async () => {
    await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
  };
  const repost = async () => {
    await fetch(`/api/posts/${post.id}/repost`, { method: "POST" });
  };

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

      
      <div style={{ marginTop: 12 }}>
        <PostActions isOwner={isOwner} onLike={like} onRepost={repost} />
      </div>

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
