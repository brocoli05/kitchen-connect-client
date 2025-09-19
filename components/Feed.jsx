import React from "react";
import "../styles/main.css";
import { Row, Col } from "react-bootstrap";
export default function Feed({ kind }) {
  return (
    <>
      {kind === "normal" ? (
        <Col
          className="rounded"
          style={{ border: "1px solid #e0e0e0", width: "70%" }}
        >
          <Row className="align-items-center mb-2">
            <Col xs="auto">
              <img
                src="/Avatar.png"
                alt="User Avatar"
                style={{ width: "40px", height: "40px", borderRadius: "50%" }}
              />
            </Col>
            <Col>
              <h2 style={{ margin: 0 }}>Username</h2>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#888" }}>
                time stamp
              </p>
            </Col>
          </Row>
          <Row className="feed-content">
            <p>This is a sample post content.</p>
          </Row>
          <Row>
            <img src="/sample_post.png" alt="Sample Post" />
          </Row>
          <Row className="feed-interactions">
            <Col>
              <button className="feed-action-btn">
                <img src="/favoriate.png" alt="Like" /> Like
              </button>
            </Col>
            <Col>
              <button className="feed-action-btn">
                <img src="/chat_bubble.png" alt="Comment" /> Comment
              </button>
            </Col>
            <Col>
              <button className="feed-action-btn">
                <img src="/forward.png" alt="Share" /> Share
              </button>
            </Col>
          </Row>
        </Col>
      ) : (
        <Col
          className="rounded d-flex flex-column align-items-center"
          style={{
            border: "1px solid #e0e0e0",
            maxWidth: "240px",
            maxHeight: "394px",
            padding: "16px 8px",
            position: "relative",
            background: "#fff",
          }}
        >
          {/* Image */}
          <img
            src={"/sample_post.png"}
            alt="Sample Post"
            style={{
              maxWidth: "208px",
              width: "100%",
              display: "block",
              borderRadius: "12px",
            }}
          />
          {/* Heart and count */}
          <div
            className="d-flex align-items-center mt-2 mb-2"
            style={{ width: "100%" }}
          >
            <img
              src={"/favoriate.png"}
              alt="Like"
              style={{ width: "20px", height: "20px", marginRight: "6px" }}
            />
            <span style={{ fontWeight: 500, color: "#e25555" }}>accounts</span>
          </div>
          {/* Bio */}
          <div
            style={{
              width: "100%",
              color: "#555",
              fontSize: "0.95rem",
              marginBottom: "8px",
            }}
          >
            This is a sample bio.
          </div>
          {/* Username */}
          <div
            style={{
              width: "100%",
              fontWeight: 600,
              //   fontSize: "1.1rem",
              color: "#222",
              marginTop: "auto",
              textAlign: "left",
            }}
          >
            Username
          </div>
        </Col>
      )}
    </>
  );
}
