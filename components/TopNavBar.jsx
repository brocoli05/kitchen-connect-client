import React, { useState } from "react";
import "../styles/main.css";
import { useRouter } from "next/router";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
export default function TopNavBar({}) {
  return (
    <Row className="topnav">
      <Col className="topnav-left">
        <a className="active" href="/">
          Kitchen Connect
        </a>
      </Col>
      <Col className="topnav-right">
        <a href="/settings">...</a>
        <a href="/share">Share</a>
        <a href="/profile/edit">
          <img src={"/Avatar.g"} alt="User Avatar" />
        </a>
      </Col>
    </Row>
  );
}
