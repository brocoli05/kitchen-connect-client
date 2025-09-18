import TopNavBar from "@/components/TopNavBar";
import React from "react";
import "../styles/main.css";
import { Row, Col } from "react-bootstrap";
import { useState } from "react";
import Feed from "@/components/Feed";
// ToggleList component for collapsible menu
function ToggleList({ title }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mainpage-left-toggle-list">
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          color: "black",
          marginBottom: "8px",
          padding: "6px 16px",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
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
      <Col>
        <img
          src={user.avatarUrl}
          alt="Avatar"
          style={{ width: 50, height: 50, borderRadius: 25 }}
        />
      </Col>
      <Col>
        <p>{user.userName}</p>
        <p>{user.bio}</p>
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
  return (
    <>
      <TopNavBar />
      <Row className="mainpage">
        <Col className="mainpage-left">
          <p style={{ fontWeight: "bold", fontSize: "24px" }}>Feed</p>
          <ToggleList title="Discover" />
          <ToggleList title="Personal" />
          <ToggleList title="Kitchen" />
          <Row>
            <button className="post-button">Post</button>
          </Row>
        </Col>

        <Col className="mainpage-center">
          <Row>
            {/* quick post */}
            <Col>
              <input
                type="text"
                placeholder="What's on your mind?"
                style={{ width: "100%", padding: "8px", borderRadius: "4px" }}
              />
            </Col>
            <Col>
              <button className="post-button">Post</button>
            </Col>
          </Row>
          <Feed />
        </Col>
        <Col className="mainpage-right">
          <p style={{ fontWeight: "bold", fontSize: "24px" }}>Suggested</p>
          <Row>
            <Feed />
          </Row>
          <Row>
            <p style={{ fontWeight: "bold", fontSize: "24px" }}>Contacts</p>
            {/* should connect to different users */}
            <Contact user={testUser} />
          </Row>
        </Col>
      </Row>
    </>
  );
}
