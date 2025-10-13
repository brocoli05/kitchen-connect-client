// components/PostCard.jsx
import Link from "next/link";
import { useRouter } from "next/router";

function normalizeId(v) {
  // Accept: string | ObjectId | {$oid: "..."}
  if (!v) return "";
  if (typeof v === "string") return v;
  if (v.$oid) return v.$oid;
  if (v.toString) return v.toString();
  try { return String(v); } catch { return ""; }
}

export default function PostCard({ post }) {
  const router = useRouter();

  // Normalize post id
  const postId = normalizeId(post?.id ?? post?._id);

  // Try multiple author fields then normalize
  const rawAuthor =
    post?.authorId ??
    post?.userId ??
    post?.author?.id ??
    post?.author ??
    null;
  const authorId = normalizeId(rawAuthor);

  const handleCardClick = (e) => {
    // Avoid double navigation if clicking on a link
    if (e.target.tagName === "A" || e.target.closest("a")) return;
    if (postId) router.push(`/posts/${encodeURIComponent(postId)}`);
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        cursor: postId ? "pointer" : "default",
      }}
    >
      <h3 style={{ margin: "0 0 8px 0" }}>{post.title}</h3>

      {post.photo && (
        <img
          src={post.photo}
          alt={post.title || "Post image"}
          style={{
            width: "100%",
            maxHeight: 200,
            objectFit: "cover",
            borderRadius: 6,
            marginBottom: 8,
          }}
        />
      )}
      <p style={{margin:'0 0 8px 0', color:'#555'}}>{post.excerpt ?? post.content?.slice(0,100)}...</p>
      <div style={{display:'flex', gap:12, fontSize:14}}>
        <Link href={`/posts/${post.id || post._id?.$oid || post._id}`}>View</Link>
        {post.authorId && <Link href={`/users/${post.authorId}`}>Author</Link>}
      </div>
    </div>
  );
}
