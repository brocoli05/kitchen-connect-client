import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import PostCard from "@/components/PostCard";

export default function OtherUserProfile() {
  const router = useRouter();
  const { userId } = router.query;
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let ignore = false;
    (async () => {
      try {
       
        const [uRes, pRes] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/users/${userId}/posts`)
        ]);
        const [u, p] = await Promise.all([uRes.json(), pRes.json()]);
        if (!ignore) {
          setUser(u);
          setPosts(p.items ?? p); 
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [userId]);

  if (loading) return <p style={{marginTop:80, marginLeft:290}}>Loading...</p>;
  if (!user) return <p style={{marginTop:80, marginLeft:290}}>User not found</p>;

  return (
    <div style={{marginTop:80, marginLeft:290, marginRight:24}}>
      <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:16}}>
        <div style={{width:56, height:56, borderRadius:'50%', background:'#eee'}} />
        <div>
          <h2 style={{margin:0}}>{user.name ?? user.username ?? `User ${user.id}`}</h2>
          <p style={{margin:'4px 0', color:'#666'}}>{user.bio ?? "No bio yet."}</p>
        </div>
      </div>

      <h3 style={{marginTop:24}}>Posts</h3>
      {posts?.length ? (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : (
        <p>No posts yet.</p>
      )}

      <div style={{marginTop:16}}>
        <Link href="/">← Back</Link>
      </div>
    </div>
  );
}
