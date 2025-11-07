import { useEffect, useState } from "react";
import Head from "next/head";
import TopNavBar from "@/components/TopNavBar";
import api from "@/utils/api";
import ActivityItem from "@/components/ActivityItem";
import Link from "next/link";

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [q, setQ] = useState("");

  const fetchPage = async (p = 1) => {
    setLoading(true);
    try {
  const res = await api.get("/users/history", { params: { page: p, limit: 10, type: typeFilter || undefined, q: q || undefined } });
      setItems(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
      setPage(res.data.page || 1);
    } catch (e) {
      console.error("Failed to load history", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, [typeFilter, q]);

  return (
    <>
      <TopNavBar />

      <div style={{ maxWidth: 920, margin: "72px auto", padding: "0 16px" }}>
        <div style={{ padding: 20 }}>
          <Link href="/">← Back</Link>
        </div>

        <h1 style={{ textAlign: "center", marginBottom: 12 }}>Your Activity</h1>
        <br />

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 18 }}>
          <input
            placeholder="Search history by title..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              padding: "8px 12px",
              width: 420,
              borderRadius: 8,
              backgroundColor: "transparent",
              color: "#000000ff'",
            }}
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid'#000000ff'",
              backgroundColor: "transparent",
              color: "#000000ff",
            }}
          >
            <option value="">All</option>
            <option value="view">Viewed</option>
            <option value="comment">Commented</option>
            <option value="favorite">Saved</option>
            <option value="unsaved">Unsaved</option>
            <option value="comment_edited">Edited comments</option>
            <option value="comment_deleted">Deleted comments</option>
          </select>

          <button
            onClick={async () => {
              try {
                setLoading(true);
                await api.delete("/users/history");
                // refresh
                setQ("");
                setTypeFilter("");
                await fetchPage(1);
              } catch (e) {
                console.error("Failed to clear history", e);
                alert("Failed to clear history. Please try again.");
              } finally {
                setLoading(false);
              }
            }}
            style={{ padding: "8px 12px", background: "#e53e3e", color: "#ffffffff", border: "none", borderRadius: 8 }}
          >
            Clear History
          </button>
        </div>

        {loading && <div style={{ padding: 12 }}>Loading...</div>}

        {!loading && items.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
            No activity yet.
          </div>
        )}
        <br/>
        <div style={{ background: "#ffffffff", border: "1px solid #eaeaea", borderRadius: 12, overflow: "hidden" }}>
          {items.map((it, idx) => (
            <ActivityItem key={idx} item={it} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 14 }}>
          <button
            disabled={page <= 1}
            onClick={() => fetchPage(Math.max(1, page - 1))}
            style={{
              padding: "8px 12px",
              background: "#ffffffff",
              color: "#000000ff",
              border: "1px solid 000000ff",
              borderRadius: 8,
              cursor: page <= 1 ? "not-allowed" : "pointer",
              opacity: page <= 1 ? 0.6 : 1,
            }}
          >
            Prev
          </button>

          <div style={{ alignSelf: "center" }}>{page} / {totalPages}</div>

          <button
            disabled={page >= totalPages}
            onClick={() => fetchPage(Math.min(totalPages, page + 1))}
            style={{
              padding: "8px 12px",
              background: "#ffffffff",
              color: "#000000ff",
              border: "1px solid 000000ff",
              borderRadius: 8,
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              opacity: page >= totalPages ? 0.6 : 1,
            }}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
