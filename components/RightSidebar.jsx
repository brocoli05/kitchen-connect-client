import React from "react";
import { Row, Col } from "react-bootstrap";
import Link from "next/link";
import PostCard from "./PostCard";

function Contact({ user }) {
  return (
    <Row className="mb-3">
      <Col md={4}>
        <img
          src={user.avatarUrl || "/avatar.png"}
          className="profile-contact-img"
        />
      </Col>
      <Col md={8}>
        <Link href={`/users/${user.id}`}>
          <p className="profile-contact-name">{user.name || user.username}</p>
        </Link>
      </Col>
    </Row>
  );
}

export default function RightSidebar({ suggestedPosts, followingUsers }) {
  return (
    <>
      <p className="left-right-title">Suggested</p>
      <Row className="feed-row d-flex justify-content-start">
        {/* Display one suggested post (random post from other users) */}
        {Array.isArray(suggestedPosts) && suggestedPosts.length > 0 ? (
          <PostCard
            key={`suggested-${suggestedPosts[0]._id || suggestedPosts[0].id}`}
            post={suggestedPosts[0]}
          />
        ) : (
          <div>No suggested posts available</div>
        )}
      </Row>
      <Row>
        <p style={{ fontWeight: "bold", fontSize: "24px" }}>Following</p>
        {followingUsers.length > 0 ? (
          followingUsers.map((user) => <Contact key={user._id} user={user} />)
        ) : (
          <div style={{ color: "#666", fontStyle: "italic" }}>
            You're not following anyone yet. Go explore and follow some users!
          </div>
        )}
      </Row>
    </>
  );
}
