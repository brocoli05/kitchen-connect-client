// pages/posts/favorite.jsx
import { useEffect, useState } from "react";
import Link from "next/link";
import TopNavBar from "@/components/TopNavBar";

/**
 * Favorites page: lists user's saved posts with pagination
 * - Requires JWT stored as localStorage.userToken
 * - Calls /api/posts/favorites?page=&limit=
 */
export default function FavoritePostsPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 12;

  const fetchFavorites = async (p = 1) => {
    // Guard for missing token
    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) {
      setItems([]);
      setTotalPages(1);
      setPage(1);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`/api/posts/favorites?page=${p}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      if (resp.ok) {
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || p);
      } else {
        console.error("Favorites API error:", data?.message);
        setItems([]);
        setTotalPages(1);
      }
    } catch (e) {
      console.error("Failed to load favorites:", e);
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TopNavBar />
      <div style={{ maxWidth: 960, margin: "72px auto", padding: "0 16px" }}>
        <h1>My Favorite Posts</h1>

        {loading && <div style={{ padding: 16 }}>Loading...</div>}
        {!loading && items.length === 0 && (
          <div style={{ padding: 16, color: "#6b7280" }}>
            No favorites yet. Save a post to see it here.
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {items.map((p) => (
            <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: "0 0 8px" }}>
                <Link href={`/posts/${p.id}`}>{p.title || "(no title)"}</Link>
              </h3>

              {p.photo && (
                <img
                  src={p.photo}
                  alt=""
                  style={{
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "cover",
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                />
              )}

              <p style={{ margin: 0, color: "#555" }}>
                {(p.excerpt ?? p.content ?? "").toString().slice(0, 140)}
                {(p.content?.length || 0) > 140 ? "..." : ""}
              </p>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            <button
              disabled={page <= 1}
              onClick={() => fetchFavorites(page - 1)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd" }}
            >
              Prev
            </button>

            <span style={{ padding: "6px 10px" }}>
              {page} / {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => fetchFavorites(page + 1)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd" }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </>
  );
}