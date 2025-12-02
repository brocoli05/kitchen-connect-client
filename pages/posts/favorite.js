import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import PostCard from "@/components/PostCard";
import Layout from "@/components/Layout";
import api from "@/utils/api";
import Link from "next/link";

export default function FavoritePosts() {
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState("");
  const [suggestedPosts, setSuggestedPosts] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      router.push("/");
      return;
    }

    const getFavorites = async () => {
      try {
        const res = await api.get("/users/favorite", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPosts(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    const getSuggestedAndFollowing = async () => {
      try {
        const suggestedRes = await api.get("/users/suggested/posts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuggestedPosts(suggestedRes.data?.items || []);

        const followingRes = await api.get("/users/following", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFollowingUsers(followingRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getFavorites();
    getSuggestedAndFollowing();
  }, [router]);

  if (loading) return <div>Loading...</div>;

  return (
    <Layout suggestedPosts={suggestedPosts} followingUsers={followingUsers}>
      <div style={{ padding: "20px", paddingLeft: "40px" }}>
        <Link href="/">← Back</Link>
      </div>
      <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: "20px 0" }}>
        Your Favorite Recipes
      </h1>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "18px",
        }}
      >
        <input
          type="text"
          placeholder="Search saved recipes by title..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            padding: "10px",
            width: "100%",
            maxWidth: 2000,
            borderRadius: 8,
          }}
        />
      </div>

      {/* Post Grid */}
      {posts.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: "200px" }}>
          <h3>No favorite recipes saved yet!</h3>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(600px, 1fr))",
            gap: "15px",
          }}
        >
          {posts.map((p) => (
            <PostCard key={p._id} post={p} />
          ))}
        </div>
      )}
    </Layout>
  );
}
