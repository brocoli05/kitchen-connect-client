import TopNavBar from "@/components/TopNavBar";
import React from "react";
import { Row, Col } from "react-bootstrap";
import { useState } from "react";
import Feed from "@/components/Feed";
import { useRouter } from "next/router";
import PostDetail from "./posts/[postId]";
import PostCard from "@/components/PostCard";

// Sample post data
const sample_post = {
  _id: { $oid: "68d1f266f09b965d550486d6" },
  title: "Homemade Pizza",
  content: "How to make amazing pizza:",
  photo: "/pizza.jpg",
  authorId: "user123",
};

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
            {/* <Feed kind="normal" /> */}
            <PostCard post={sample_post} />
          </Row>
        </Col>
        <Col md={3} className="mainpage-right p-3">
          <p className="left-right-title">Suggested</p>
          <Row className="feed-row d-flex justify-content-start">
            {/* <Feed kind="suggested" />
             */}
            <PostCard post={sample_post} />
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
