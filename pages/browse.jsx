import Layout from "@/components/Layout";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const pickImageUrl = (post) =>
  post?.photo ||
  post?.imageUrl ||
  post?.image ||
  post?.coverImage ||
  post?.featuredImage ||
  post?.images?.[0]?.url ||
  post?.photos?.[0]?.url ||
  post?.photos?.[0] ||
  "";

const shuffleAndPick = (items, take = 9) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, take);
};

const refreshButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 20px",
  width: "auto",
  borderRadius: 9999,
  fontWeight: 600,
  fontSize: 14,
  border: "none",
  cursor: "pointer",
  background:
    "linear-gradient(135deg, rgba(34,197,94,0.95) 0%, rgba(16,185,129,0.95) 100%)",
  color: "#fff",
  boxShadow: "0 10px 20px rgba(16,185,129,0.25)",
  whiteSpace: "nowrap",
  transition: "transform 120ms ease, box-shadow 120ms ease",
};

export default function BrowsePage() {
  const [galleryPosts, setGalleryPosts] = useState([]);
  const [sidebarSuggested, setSidebarSuggested] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchRecommendations = async () => {
      setLoading(true);
      setError("");

      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("userToken") : null;

        const [suggestedRes, meRes] = await Promise.all([
          fetch("/api/users/suggested/posts", {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          token
            ? fetch("/api/me", {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve({ ok: false }),
        ]);

        if (!suggestedRes.ok) {
          throw new Error("Failed to load recommendations");
        }

        const data = await suggestedRes.json();
        const withImages = (data?.items || []).filter((post) => {
          const url = pickImageUrl(post);
          if (typeof url === "string") return url.trim().length > 0;
          return Boolean(url);
        });
        const selection = shuffleAndPick(withImages, 9);

        let followData = [];
        if (meRes.ok) {
          const me = await meRes.json();
          if (Array.isArray(me.following) && me.following.length) {
            const details = await Promise.all(
              me.following.map(async (userId) => {
                const res = await fetch(`/api/users/${userId}`);
                if (!res.ok) return null;
                return res.json();
              })
            );
            followData = details.filter(Boolean);
          }
        }

        if (!cancelled) {
          setGalleryPosts(selection);
          setSidebarSuggested(shuffleAndPick(withImages, 3));
          setFollowingUsers(followData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load recommendations");
          setGalleryPosts([]);
          setSidebarSuggested([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRecommendations();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const handleRefresh = () => setRefreshToken((token) => token + 1);

  const mainContent = useMemo(() => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
          Loading recommendations...
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: "center", padding: "40px", color: "#b91c1c" }}>
          {error}
        </div>
      );
    }

    if (!galleryPosts.length) {
      return (
        <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
          No photo-ready recommendations yet. Try refreshing again soon!
        </div>
      );
    }

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        {galleryPosts.map((post) => {
          const href = `/posts/${post._id || post.id}`;
          const imageUrl = pickImageUrl(post);
          return (
            <Link
              key={post._id || post.id}
              href={href}
              style={{
                borderRadius: 12,
                overflow: "hidden",
                position: "relative",
                aspectRatio: "1 / 1",
                background: "#f3f4f6",
              }}
            >
              <img
                src={imageUrl}
                alt={post.title || "Recommended recipe"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "8px 10px",
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {post.title || "Untitled"}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }, [galleryPosts, loading, error]);

  return (
    <Layout suggestedPosts={sidebarSuggested} followingUsers={followingUsers}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Browse Recommendations</h2>
        <button
          onClick={handleRefresh}
          className="post-button"
          style={{
            ...refreshButtonStyle,
            opacity: loading ? 0.7 : 1,
            transform: loading ? "scale(0.98)" : "scale(1)",
          }}
          disabled={loading}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: loading ? 8 : 0 }}>
            {loading ? "Refreshing..." : "Refresh"}
            {loading && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4V1L8 5l4 4V6c3.308 0 6 2.692 6 6s-2.692 6-6 6-6-2.692-6-6H4c0 4.418 3.582 8 8 8s8-3.582 8-8-3.582-8-8-8Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </span>
        </button>
      </div>
      <p style={{ color: "#4b5563", marginBottom: 24 }}>
        Discover nine randomly selected recipes with photos every time you refresh.
      </p>
      <div style={{ width: "100%" }}>{mainContent}</div>
    </Layout>
  );
}
