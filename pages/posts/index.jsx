import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function PostsListPage() {
  const router = useRouter();
  const [posts, setPosts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`/api/posts`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => {
        setPosts(data.items || []);
      })
      .catch((e) => {
        console.error("Failed to load posts", e);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div style={{padding:24}}>Loading...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '72px auto', padding: '0 16px' }}>
      <h1>Recipe List</h1>
      {Array.isArray(posts) && posts.length === 0 && (
        <div>No recipes available.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {posts && posts.map((p) => (
          <div key={p.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 6px 0' }}><Link href={`/posts/${p.id}`}>{p.title || '(no title)'}</Link></h3>
            <div style={{ color: '#6b7280', fontSize: 14 }}>{p.excerpt}</div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>By: {p.author || 'Unknown'} • {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
