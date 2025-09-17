import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import PostActions from "@/components/PostActions";

export default function PostDetail() {
  const router = useRouter();
  const { postId } = router.query;
  const [post, setPost] = useState(null);
  const [me, setMe] = useState(null); // Current User Information
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    let ignore = false;
    (async () => {
      try {
        const [meRes, pRes] = await Promise.all([
          fetch(`/api/me`),
          fetch(`/api/posts/${postId}`)
        ]);
        const [meData, p] = await Promise.all([meRes.json(), pRes.json()]);
        if (!ignore) {
          setMe(meData);
          setPost(p);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [postId]);

  if (loading) return <p style={{marginTop:80, marginLeft:290}}>Loading...</p>;
  if (!post) return <p style={{marginTop:80, marginLeft:290}}>Post not found</p>;

  const isOwner = me?.id && post?.authorId && me.id === post.authorId;

  const like = async () => {
    await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
  };
  const repost = async () => {
    await fetch(`/api/posts/${post.id}/repost`, { method: "POST" });
  };

  return (
    <div style={{marginTop:80, marginLeft:290, marginRight:24}}>
      <div style={{marginBottom:8}}>
        <Link href={`/users/${post.authorId}`}>← {post.authorName ?? "Author"}</Link>
      </div>
      <h2 style={{margin:'8px 0 16px 0'}}>{post.title}</h2>
      {post.imageUrl && (
        <img src={post.imageUrl} alt="" style={{maxWidth:'100%', borderRadius:8, marginBottom:12}} />
      )}
      <pre
        style={{
          whiteSpace:'pre-wrap',
          fontFamily:'inherit',
          lineHeight:1.6,
          background:'#fafafa',
          border:'1px solid #eee',
          padding:16,
          borderRadius:8
        }}
      >
        {post.content}
      </pre>

      <PostActions isOwner={isOwner} onLike={like} onRepost={repost} />

      <div style={{marginTop:16}}>
        <Link href="/">Back to Home</Link>
      </div>
    </div>
  );
}
