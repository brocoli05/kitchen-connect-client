import TopNavBar from "@/components/TopNavBar";
import React from "react";
import { Row, Col } from "react-bootstrap";
import { useState, useEffect } from "react";
import Feed from "@/components/Feed";
import { useRouter } from "next/router";
import PostDetail from "./posts/[postId]";
import PostCard from "@/components/PostCard";

// We'll fetch real user posts instead of using sample data

// ToggleList component for collapsible menu
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
            <a href="#/action-2">Saved</a>
          </li>
          <li>
            <a href="#/action-3">Lists</a>
          </li>
        </ul>
      )}
      {open && title === "Kitchen" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>
            <a href="#/action-1">Recipes</a>
          </li>
          <li>
            <a href="#/action-2">Recommended</a>
          </li>
          <li>
            <a href="#/action-4">Trending</a>
          </li>
          <li>
            <a href="#/action-5">Resources</a>
          </li>
        </ul>
      )}
      <button onClick={() => setOpen((prev) => !prev)}></button>
    </div>
  );
}
function Contact({ user }) {
  return (
    <Row>
      <Col md={4}>
        <img
          src={user.avatarUrl}
          alt="Avatar"
          className="profile-contact-img"
        />
      </Col>
      <Col md={8}>
        <p className="profile-contact-name">{user.userName}</p>
        <p className="profile-contact-bio">{user.bio}</p>
      </Col>
    </Row>
  );
}
const testUser = {
  id: 1,
  userName: "Carlo Emilio",
  avatarUrl: "/testContact.png",
  bio: "Let's go",
};
export default function Home() {
  const router = useRouter();
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch current user and their posts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current user info
        const userResponse = await fetch('/api/me');
        if (userResponse.ok) {
          const user = await userResponse.json();
          console.log('User data:', user); // Debug log
          setCurrentUser(user);
          
          // Fetch user's posts using their email
          const postsResponse = await fetch(`/api/users/${user.id}/posts`);
          if (postsResponse.ok) {
            const posts = await postsResponse.json();
            console.log('Posts data:', posts); // Debug log
            
            // Ensure posts is an array
            if (Array.isArray(posts)) {
              setUserPosts(posts);
            } else {
              console.error('Posts response is not an array:', posts);
              setUserPosts([]); // Set empty array as fallback
            }
          } else {
            console.error('Failed to fetch posts:', postsResponse.status);
            setUserPosts([]);
          }
        } else {
          console.error('Failed to fetch user:', userResponse.status);
          setUserPosts([]);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserPosts([]); // Ensure userPosts is always an array
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
          <Row className="d-flex justify-content-center">
            <button
              className="post-button "
              onClick={() => router.push("/posts/create")}
            >
              Post
            </button>
          </Row>
        </Col>

        <Col md={7} className="mainpage-center ">
          <Row className="quick-post d-flex justify-content-center m-1">
            {/* quick post */}
            <Col
              md={10}
              className="d-flex align-items-center quick-post"
              style={{ border: "none" }}
            >
              <input
                type="text"
                placeholder="What's on your mind?"
                style={{ width: "100%", border: "none", borderRadius: "4px" }}
              />
            </Col>
            <Col md={2} className="d-flex justify-content-end">
              <img src={"/mic.svg"} alt="mic" />
              <img src={"/mood.svg"} alt="mood" />
              <img src={"/photo.svg"} alt="photo" />
            </Col>
          </Row>
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
            {/* Display suggested posts (could be other users' posts) */}
            {Array.isArray(userPosts) && userPosts.length > 0 ? (
              userPosts.slice(0, 2).map((post) => (
                <PostCard key={`suggested-${post._id || post.id}`} post={post} />
              ))
            ) : (
              <div>No suggested posts available</div>
            )}
          </Row>
          <Row>
            <p style={{ fontWeight: "bold", fontSize: "24px" }}>Contacts</p>
            <Contact user={testUser} />
          </Row>
        </Col>
      </Row>
    </>
  );
}
