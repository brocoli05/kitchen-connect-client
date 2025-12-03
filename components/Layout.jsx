import TopNavBar from "./TopNavBar";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import { Row, Col } from "react-bootstrap";

export default function Layout({
  children,
  suggestedPosts = [],
  followingUsers = [],
  isAdmin,
}) {
  return (
    <>
      <TopNavBar />
      <Row className="mainpage" style={{ padding: "20px 40px" }}>
        <Col md={2} className="mainpage-left">
        <LeftSidebar isAdmin={isAdmin} />
        </Col>
        <Col md={7} className="mainpage-center">
          {children}
        </Col>
        <Col md={3} className="mainpage-right p-3">
          <RightSidebar
            suggestedPosts={suggestedPosts}
            followingUsers={followingUsers}
          />
        </Col>
      </Row>
    </>
  );
}
