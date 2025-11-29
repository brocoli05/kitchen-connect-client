// pages/trending.jsx
import TopNavBar from "@/components/TopNavBar";
import React, { useEffect, useState } from "react";
import { Row, Col } from "react-bootstrap";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import api from "@/utils/api";

function ToggleList({ title }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mainpage-left-toggle-list">
      <button onClick={() => setOpen((prev) => !prev)} className="list-title">
        {title}
      </button>
      {open && title === "Discover" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>
            <a href="#/action-1">Home</a>
          </li>
          <li>
            <a href="#/action-2">Browse</a>
          </li>
          <li>
            <a href="#/action-3">Explore</a>
          </li>
        </ul>
      )}
      {open && title === "Personal" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>
            <a href="#/action-1">Notifications</a>
          </li>
          <li>
            <a href="/posts/favorite">Favorites</a>
          </li>
          <li>
            <a href="#/action-3">Lists</a>
          </li>
          <li>
            <a href="/history">History</a>
          </li>
        </ul>
      )}
      {open && title === "Kitchen" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>
            <a href="/recipes">Recipes</a>
          </li>
          <li>
            <a href="#/action-2">Recommended</a>
          </li>
          <li>
            <a href="/trending">Trending</a>
          </li>
          <li>
            <a href="#/action-4">Resources</a>
          </li>
        </ul>
      )}
    </div>
  );
}

function Contact({ user }) {
  return (
    <Row className="mb-3">
      <Col md={4}>
        <img
          src={user.avatarUrl || "/avatar.png"}
          alt="Avatar"
          className="profile-contact-img"
        />
      </Col>
      <Col md={8}>
        <Link href={`/users/${user.id}`} style={{ textDecoration: "none" }}>
          <p
            className="profile-contact-name"
            style={{ cursor: "pointer", color: "#007bff" }}
          >
            {user.name || user.username}
          </p>
        </Link>
        <p className="profile-contact-bio">{user.bio || "No bio available"}</p>
      </Col>
    </Row>
  );
}

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
        const items = res.data.items || [];
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

  return (
    <>
      <TopNavBar />
      <Row className="mainpage" style={{ marginTop: 20 }}>
        {/* Left Section */}
        <Col md={2} className="mainpage-left">
          <p className="left-right-title">Feed</p>
          <ToggleList title="Discover" />
          <ToggleList title="Personal" />
          <ToggleList title="Kitchen" />
        </Col>

        {/* Trending contents */}
        <Col md={7} className="mainpage-center">
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
        </Col>

        {/* Right Section */}
        <Col md={3} className="mainpage-right p-3">
          <p className="left-right-title">Suggested</p>
          <Row className="feed-row d-flex justify-content-start">
            {suggestedPosts.length > 0 ? (
              suggestedPosts.map((post) => (
                <PostCard
                  key={`suggested-${post._id || post.id}`}
                  post={post}
                />
              ))
            ) : (
              <div>No suggested posts available</div>
            )}
          </Row>
          <Row>
            <p style={{ fontWeight: "bold", fontSize: "24px" }}>Following</p>
            {followingUsers.length > 0 ? (
              followingUsers.map((user) => (
                <Contact key={user._id} user={user} />
              ))
            ) : (
              <div style={{ color: "#666", fontStyle: "italic" }}>
                You're not following anyone yet.
              </div>
            )}
          </Row>
        </Col>
      </Row>
    </>
  );
}
