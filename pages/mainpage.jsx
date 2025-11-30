import TopNavBar from "@/components/TopNavBar";
import React from "react";
import { Row, Col } from "react-bootstrap";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import PostCard from "@/components/PostCard";
import Link from "next/link";
const GEOLOCATION_TIMEOUT = 8000;

function ToggleList({ title }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mainpage-left-toggle-list">
	<Row 
	style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
	onClick={() => setOpen(prev => !prev)}
	className="list-title"
	>
		<span style={{width: "80%"}}>{title}</span>

	<span style={{ fontSize: "20px", width: "20%", fontFamily: "monospace" }}>
		{open ? "⌃" : "⌄"}
	</span>
	</Row>
      {open && title === "Discover" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
		<li className="list-item">
		<a className="list-link" href="/">
			<span style={{ marginRight: "18px" }}>🏠</span>
			Home
		</a>
		</li>
          <li className="list-item">
            <a className="list-link" href="#/action-2">
			<span style={{ marginRight: "18px" }}>🔎</span>
			Browse
			</a>
          </li>
          <li className="list-item">
            <a className="list-link" href="#/action-1"><span style={{ marginRight: "18px" }}>🌎</span>Explore</a>
          </li>
        </ul>
      )}
      {open && title === "Personal" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li className="list-item">
            <a className="list-link" href="#/action-1"><span style={{ marginRight: "18px" }}>🔔</span>Notifications</a>
          </li>
          <li className="list-item">
            <a className="list-link" href="/posts/favorite"><span style={{ marginRight: "18px" }}>🔖</span>Favorites</a>
          </li>
          <li className="list-item">
            <a className="list-link" href="#/action-3"><span style={{ marginRight: "18px" }}>📙</span>Lists</a>
          </li>
              <li className="list-item">
                <a className="list-link" href="/history"><span style={{ marginRight: "18px" }}>👣</span>History</a>
              </li>
        </ul>
      )}
      {open && title === "Kitchen" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li className="list-item">
            <a className="list-link" href="/recipes"><span style={{ marginRight: "18px" }}>🍎</span>Recipes</a>
          </li>
          <li className="list-item">
            <Link className="list-link" href="/messages">
              <span style={{ marginRight: "18px" }}>💬</span>
              Messages
            </Link>
          </li>
          <li className="list-item">
            <a className="list-link" href="#/action-3"><span style={{ marginRight: "18px" }}>🔥</span>Trending</a>
          </li>
          <li className="list-item">
            <button
            onClick={() => openGoogleMaps()}
            style={{
              border: 'none',
              backgroundColor: "inherit",
            }}
			className="list-link"
			>
				<span style={{ marginRight: "18px" }}>🥕</span>Resources
			</button>
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
          src={user.avatarUrl || '/avatar.png'}
          alt="Avatar"
          className="profile-contact-img"
        />
      </Col>
      <Col md={8}>
        <Link href={`/users/${user.id}`} style={{ textDecoration: 'none' }}>
          <p className="profile-contact-name" style={{ cursor: 'pointer', color: '#007bff' }}>
            {user.name || user.username}
          </p>
        </Link>
        <p className="profile-contact-bio">{user.bio || 'No bio available'}</p>
      </Col>
    </Row>
  );
}
  // Open Google Maps directly. If geolocation is available and permitted, center on user's location.
  const openGoogleMaps = (query = "grocery store") => {
    const q = encodeURIComponent(query || "grocery store");

    const openUrl = (lat, lng) => {
      let url;
      if (lat != null && lng != null) {
        url = `https://www.google.com/maps/search/${q}/@${lat},${lng},14z`;
      } else {
        url = `https://www.google.com/maps/search/${q}`;
      }
      window.open(url, "_blank");
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      const called = { v: false };
      const timer = setTimeout(() => {
        if (!called.v) {
          called.v = true;
          openUrl(); // fallback without coords
        }
      }, GEOLOCATION_TIMEOUT);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (called.v) return;
          called.v = true;
          clearTimeout(timer);
          openUrl(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          if (called.v) return;
          called.v = true;
          clearTimeout(timer);
          openUrl();
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    } else {
      // No geolocation available
      openUrl();
    }
  };
export default function Home() {
  const router = useRouter();
  const [userPosts, setUserPosts] = useState([]);
  const [suggestedPosts, setSuggestedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [followingUsers, setFollowingUsers] = useState([]);

  // Fetch current user and their posts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get the token from localStorage
        const token = localStorage.getItem("userToken");
        
        if (!token) {
          console.error("No token found, redirecting to login");
          router.push("/login");
          return;
        }

        // Get current user info with authorization header
        const userResponse = await fetch('/api/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (userResponse.ok) {
          const user = await userResponse.json();
          console.log('User data:', user); // Debug log
          setCurrentUser(user);
          
          // Fetch detailed info about users the current user is following
          if (user.following && user.following.length > 0) {
            try {
              const followingUsersData = await Promise.all(
                user.following.map(async (userId) => {
                  const response = await fetch(`/api/users/${userId}`);
                  if (response.ok) {
                    return await response.json();
                  }
                  return null;
                })
              );
              // Filter out any null results and set the following users
              const validFollowingUsers = followingUsersData.filter(user => user !== null);
              setFollowingUsers(validFollowingUsers);
              console.log('Following users:', validFollowingUsers);
            } catch (error) {
              console.error('Error fetching following users:', error);
              setFollowingUsers([]);
            }
          } else {
            setFollowingUsers([]);
          }
          
          // Fetch user's posts using their ID
          const postsResponse = await fetch(`/api/users/${user.id}/posts`);
          if (postsResponse.ok) {
            const posts = await postsResponse.json();
            console.log("Posts data:", posts);

            let items;
            if (posts.items && Array.isArray(posts.items)) {
              items = posts.items;
            } else if (Array.isArray(posts)) {
              items = posts;
            } else {
              console.error("Posts response is not an array:", posts);
              setUserPosts([]);
              return; 
            }
            let blockedPosts = [];
            let blockedUsers = [];
            try {
              const blocksRes = await fetch("/api/users/blocks", {
                headers: {
                  Authorization: `Bearer ${token}`, 
                },
              });

              if (blocksRes.ok) {
                const b = await blocksRes.json();
                blockedPosts = (b.blockedPosts || []).map(String);
                blockedUsers = (b.blockedUsers || []).map(String);
              } else {
                console.warn("Failed to fetch blocks:", blocksRes.status);
              }
            } catch (e) {
              console.error("Error fetching blocks", e);
            }

            const filtered = items.filter((p) => {
              const postId = String(p._id || p.id || "");
              const authorId = p.authorId ? String(p.authorId) : null;

              if (postId && blockedPosts.includes(postId)) return false;
              if (authorId && blockedUsers.includes(authorId)) return false;

              return true;
            });

            setUserPosts(filtered);
          } else {
            console.error("Failed to fetch posts:", postsResponse.status);
            setUserPosts([]);
          }

          const suggestedResponse = await fetch(`/api/users/suggested/posts`);
          if (suggestedResponse.ok) {
            const suggestedData = await suggestedResponse.json();
            if (suggestedData.items && Array.isArray(suggestedData.items)) {
              setSuggestedPosts(suggestedData.items); // 
            }
          } else {
            console.log('No suggested posts available');
            setSuggestedPosts([]);
          }
        } else {
          console.error('Failed to fetch user:', userResponse.status);
          setUserPosts([]);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserPosts([]); 
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <TopNavBar />
      <Row className="mainpage">
        <Col md={2} className="mainpage-left">
          <p className="left-right-title">Feed</p>
          <ToggleList title="Discover" />
          <ToggleList title="Personal" />
          <ToggleList title="Kitchen" />
          <Row className="d-flex justify-content-center m-3" >
            <button
              className="post-button "
              onClick={() => router.push("/posts/create")}
            >
              Post
            </button>
          </Row>
        </Col>

        <Col md={7} className="mainpage-center ">
          <Row className="m-5 d-flex justify-content-center">
            {/* Display user's own posts */}
            {Array.isArray(userPosts) && userPosts.length > 0 ? (
              userPosts.map((post) => (
                <PostCard key={post._id || post.id} post={post} />
              ))
            ) : (
              <div>No posts yet. Create your first post!</div>
            )}
          </Row>
        </Col>
        <Col md={3} className="mainpage-right p-3">
          <p className="left-right-title">Suggested</p>
          <Row className="feed-row d-flex justify-content-start">
            {/* Display one suggested post (random post from other users) */}
            {Array.isArray(suggestedPosts) && suggestedPosts.length > 0 ? (
              <PostCard key={`suggested-${suggestedPosts[0]._id || suggestedPosts[0].id}`} post={suggestedPosts[0]} />
            ) : (
              <div>No suggested posts available</div>
            )}
          </Row>
          <Row>
            <p style={{ fontWeight: "bold", fontSize: "24px" }}>Following</p>
            {followingUsers.length > 0 ? (
              followingUsers.map((user) => (
                <Contact 
                  key={user._id} 
                  user={user} 
                />
              ))
            ) : (
              <div style={{ color: '#666', fontStyle: 'italic' }}>
                You're not following anyone yet. Go explore and follow some users!
              </div>
            )}
          </Row>
        </Col>
      </Row>
    </>
  );
}