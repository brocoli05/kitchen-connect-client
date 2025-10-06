import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function PostsListPage() {
  const router = useRouter();
  const [posts, setPosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const limit = 10;

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    fetch(`/api/posts?page=${page}&limit=${limit}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => {
        setPosts(data.items || []);
        setPageCount(data.pageCount || 1);
      })
      .catch((e) => {
        console.error("Failed to load posts", e);
        setPosts([]);
      })
      .finally(() => setLoading(false));
  }, [router, page]);

  if (loading) return <div style={{padding:24}}>Loading...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '72px auto', padding: '0 16px' }}>
      <h1>Recipe List</h1>
      {Array.isArray(posts) && posts.length === 0 && (
        <div>No recipes available.</div>
      )}

      {/* content list above */}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {posts && posts.map((p) => (
          <div key={p.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 6px 0' }}><Link href={`/posts/${p.id}`}>{p.title || '(no title)'}</Link></h3>
            <div style={{ color: '#6b7280', fontSize: 14 }}>{p.excerpt}</div>
            <div style={{ marginTop: 8, fontSize: 13, color: '#666' }}>By: {p.author || 'Unknown'} • {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
          </div>
        ))}
      </div>

      {/* Pagination controls (bottom) */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20, gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          {/* page numbers window */}
          {(() => {
            const maxButtons = 5;
            let start = Math.max(1, page - Math.floor(maxButtons / 2));
            let end = start + maxButtons - 1;
            if (end > pageCount) {
              end = pageCount;
              start = Math.max(1, end - maxButtons + 1);
            }
            const nums = [];
            for (let i = start; i <= end; i++) nums.push(i);
            return nums.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                style={{
                  background: n === page ? '#2563eb' : '#fff',
                  color: n === page ? '#fff' : '#000',
                  border: '1px solid #ddd',
                  padding: '6px 10px',
                  borderRadius: 4,
                }}
              >
                {n}
              </button>
            ));
          })()}
          <button disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
}
