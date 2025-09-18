import React from "react";
import "../styles/main.css";
import { Row, Col } from "react-bootstrap";
export default function Feed() {
  return (
    <div>
      <Row className="feed">
        <Col>
          <img src="/Avatar.png" alt="User Avatar" />
          <h2>Username</h2>
        </Col>
        <Col>
          <p>time stamp</p>
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
          <button>
            <img src="/favoriate.png" alt="Like" /> Like
          </button>
        </Col>
        <Col>
          <button>
            <img src="/chat_bubble.png" alt="Comment" /> Comment
          </button>
        </Col>
        <Col>
          <button>
            <img src="/forward.png" alt="Share" /> Share
          </button>
        </Col>
      </Row>
    </div>
  );
}
