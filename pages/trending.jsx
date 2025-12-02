// pages/trending.jsx
import Layout from "@/components/Layout";
import React, { useEffect, useState } from "react";
import { Row, Col } from "react-bootstrap";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import api from "@/utils/api";

export default function TrendingPage() {
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [suggestedPosts, setSuggestedPosts] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("userToken");

        if (token) {
          const userRes = await fetch("/api/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (userRes.ok) {
            const user = await userRes.json();
            setCurrentUser(user);

            if (user.following?.length > 0) {
              const followingData = await Promise.all(
                user.following.map(async (userId) => {
                  const res = await fetch(`/api/users/${userId}`);
                  return res.ok ? await res.json() : null;
                })
              );
              setFollowingUsers(followingData.filter(Boolean));
            }

            const suggestedRes = await fetch("/api/users/suggested/posts");
            if (suggestedRes.ok) {
              const suggestedData = await suggestedRes.json();
              if (suggestedData.items) setSuggestedPosts(suggestedData.items);
            }
          }
        }

        const res = await api.get("/trending");
        const items = (res.data.items || []).slice(0, 5);
        const postsWithLikes = items.map((post) => ({
          ...post,
          likes: Array(post.likeCount || 0).fill(1),
        }));

        setTrendingPosts(postsWithLikes);
      } catch (err) {
        console.error(
          "Trending fetch failed:",
          err.response?.data || err.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const MainContent = (
    <>
      <h2 style={{ marginBottom: 20 }}>Trending Recipes</h2>
      {loading ? (
        <div>Loading...</div>
      ) : trendingPosts.length > 0 ? (
        trendingPosts.map((post) => (
          <div
            key={post._id || post.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <Link href={`/posts/${post._id}`}>
              <h2>{post.title}</h2>
            </Link>
            <p className="profile-contact-bio">
              Likes: {post.likes.length} | Created At:{" "}
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
            {post.photo && (
              <img
                src={post.photo}
                style={{ maxWidth: "100%", borderRadius: 8 }}
              />
            )}
          </div>
        ))
      ) : (
        <div>No trending recipes available.</div>
      )}
    </>
  );

  return (
    <>
      <Layout suggestedPosts={suggestedPosts} followingUsers={followingUsers}>
        {MainContent}
      </Layout>
    </>
  );
}
