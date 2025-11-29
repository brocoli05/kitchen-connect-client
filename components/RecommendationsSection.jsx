import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("userToken");
};

function RecommendationCard({ post, compact = false }) {
  const router = useRouter();

  const handleClick = (event) => {
    if (event.target.tagName === "A" || event.target.closest("a")) return;
    router.push(`/posts/${encodeURIComponent(post.id)}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 12,
        display: "flex",
        gap: 12,
        cursor: "pointer",
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {post.photo && (
        <img
          src={post.photo}
          alt={post.title || "Recipe"}
          style={{
            width: compact ? 72 : 96,
            height: compact ? 72 : 96,
            objectFit: "cover",
            borderRadius: 6,
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          href={`/posts/${encodeURIComponent(post.id)}`}
          style={{
            fontWeight: 600,
            display: "inline-block",
            marginBottom: 4,
            color: "#111827",
            textDecoration: "none",
          }}
        >
          {post.title || "Untitled recipe"}
        </Link>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {post.difficulty && (
            <span style={badgeStyle}>{post.difficulty}</span>
          )}
          {typeof post.timeMax === "number" && post.timeMax >= 0 && (
            <span style={badgeStyle}>{post.timeMax} min</span>
          )}
          {post.dietary && <span style={badgeStyle}>{post.dietary}</span>}
        </div>
        <p
          style={{
            margin: 0,
            color: "#4b5563",
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          {(post.excerpt || post.content || "").slice(0, compact ? 80 : 140)}
          {(post.excerpt || post.content || "").length > (compact ? 80 : 140)
            ? "…"
            : ""}
        </p>
      </div>
    </div>
  );
}

const badgeStyle = {
  fontSize: 12,
  padding: "2px 6px",
  borderRadius: 999,
  background: "#e5e7eb",
  color: "#1f2937",
};

export default function RecommendationsSection({
  limit = 4,
  title = "Recommended for you",
  description = "",
  showToggle = true,
  compact = false,
}) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [personalization, setPersonalization] = useState({
    enabled: true,
    loading: true,
    fallback: "trending",
    pending: false,
  });
  const [tokenAvailable, setTokenAvailable] = useState(false);

  const infoMessage = useMemo(() => {
    if (loading) return "Crunching the best picks...";
    if (meta?.source === "personalized") return "Personalized by your tastes";
    if (meta?.source === "mixed") return "Personalized + trending mix";
    if (meta?.reason === "disabled") return "Personalization is off";
    if (meta?.reason === "no-token") return "Trending picks (log in for AI picks)";
    if (meta?.reason === "insufficient-data") return "Not enough data yet, showing popular recipes";
    return "Popular right now";
  }, [loading, meta]);

  const fetchPersonalization = useCallback(async () => {
    const token = getToken();
    setTokenAvailable(!!token);
    if (!token) {
      setPersonalization((prev) => ({
        ...prev,
        enabled: false,
        loading: false,
        fallback: "trending",
      }));
      return;
    }

    try {
      const res = await fetch("/api/users/personalization", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load personalization");
      const data = await res.json();
      setPersonalization({
        enabled: data.enabled !== false,
        fallback: data.fallback || "trending",
        loading: false,
        pending: false,
      });
    } catch (err) {
      console.error(err);
      setPersonalization((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const url = `/api/users/suggested/posts?limit=${limit}`;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to load recommendations");
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setMeta(data.meta || null);
    } catch (err) {
      console.error(err);
      setError("Unable to load recommendations right now.");
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPersonalization();
    fetchRecommendations();
  }, [fetchPersonalization, fetchRecommendations]);

  const handleToggle = async () => {
    if (!tokenAvailable) {
      alert("Log in to manage personalization settings.");
      return;
    }
    const nextState = !personalization.enabled;
    setPersonalization((prev) => ({ ...prev, enabled: nextState, pending: true }));
    try {
      const token = getToken();
      const res = await fetch("/api/users/personalization", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: nextState }),
      });
      if (!res.ok) throw new Error("Failed to update personalization");
      const data = await res.json();
      setPersonalization({
        enabled: data.enabled !== false,
        fallback: data.fallback || "trending",
        loading: false,
        pending: false,
      });
      fetchRecommendations();
    } catch (err) {
      console.error(err);
      setPersonalization((prev) => ({ ...prev, pending: false }));
      alert("Unable to update personalization. Please try again.");
    }
  };

  const containerStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    background: "#f9fafb",
  };

  return (
    <section style={containerStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {description || infoMessage}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {showToggle && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#111",
              }}
            >
              <input
                type="checkbox"
                checked={personalization.enabled}
                disabled={personalization.loading || personalization.pending || !tokenAvailable}
                onChange={handleToggle}
              />
              <span style={{ fontSize: 13, color: "#111" }}>
                AI personalization {personalization.enabled ? "on" : "off"}
              </span>
            </label>
          )}
          <button
            type="button"
            onClick={fetchRecommendations}
            style={{
              border: "1px solid #d1d5db",
              background: "white",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 13,
              color: "#111",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{error}</div>
      )}

      {loading && !items.length && (
        <div style={{ color: "#6b7280" }}>Loading recommendations…</div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ color: "#6b7280" }}>No recommendations yet.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((post) => (
          <RecommendationCard key={post.id} post={post} compact={compact} />
        ))}
      </div>
    </section>
  );
}
