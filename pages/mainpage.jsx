import Layout from "@/components/Layout";
import React from "react";
import { Row, Col } from "react-bootstrap";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import PostCard from "@/components/PostCard";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [userPosts, setUserPosts] = useState([]);
  const [suggestedPosts, setSuggestedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [followingUsers, setFollowingUsers] = useState([]);
  const isAdmin =
  currentUser &&
  (currentUser.isAdmin === true ||
    currentUser.isAdmin === "true" ||
    currentUser.role === "admin");

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
        const userResponse = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (userResponse.ok) {
          const user = await userResponse.json();
          console.log("User data:", user); // Debug log
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
              const validFollowingUsers = followingUsersData.filter(
                (user) => user !== null
              );
              setFollowingUsers(validFollowingUsers);
              console.log("Following users:", validFollowingUsers);
            } catch (error) {
              console.error("Error fetching following users:", error);
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

            if (posts.items && Array.isArray(posts.items)) {
              setUserPosts(posts.items);
            } else if (Array.isArray(posts)) {
              setUserPosts(posts);
            } else {
              console.error("Posts response is not an array:", posts);
              setUserPosts([]);
            }
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
            console.log("No suggested posts available");
            setSuggestedPosts([]);
          }
        } else {
          console.error("Failed to fetch user:", userResponse.status);
          setUserPosts([]);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
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

  const MainContent = (
    <>
      {/* <Row className="quick-post d-flex justify-content-center m-1">

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
          </Row> */}
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
    </>
  );

  return (
    <>
      <Layout suggestedPosts={suggestedPosts} followingUsers={followingUsers} isAdmin={isAdmin}>
        {MainContent}
      </Layout>
    </>
  );
}