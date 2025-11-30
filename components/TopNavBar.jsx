import React, { useState } from "react";
import { useRouter } from "next/router";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Button, Dropdown } from "react-bootstrap";
import { signOut } from "next-auth/react";

export default function TopNavBar({}) {
  const router = useRouter();
  const iconButtonStyle = {
    backgroundColor: "transparent",
    border: "none",
    fontSize: "28px",
    marginLeft: "20px",
  };


  return (
    <div>
      <Row className="m-3 d-flex align-items-center topnav">
        <Col md={8} className="d-flex justify-content-start topnav-left">
          <a className="fw-bold active" style={{fontSize: "24px"}} href="/mainpage">
            Kitchen Connect
          </a>
        </Col>
        <Col
          md={4}
          className="d-flex justify-content-end topnav-right d-flex align-items-center"
        >
            <button
              type="button"
              style={iconButtonStyle}
              onClick={() => router.push("/posts/favorite")}
            >
              ❤️
            </button>
            <button
              type="button"
              style={iconButtonStyle}
              onClick={() => router.push("#/action-3")}
            >
              📙
            </button>
			<button
              type="button"
              style={iconButtonStyle}
              onClick={() => router.push("/history")}
            >
              👣Include
chickenkosher saltground pepperolive oilonioncelerygarlic clovesbay leavesthymelemon juice
            </button>
          <button
            onClick={() => router.push("/profile/edit")}
            className=" d-flex align-items-center h-100 justify-content-center btn btn-link"
          >
            <img
              className="rounded-circle"
              src={"/Avatar.png"}
              alt="User Avatar"
            />
          </button>
          
              <button 
			 style={{ ...iconButtonStyle, marginLeft: 0 }} 
			  onClick={() => router.push("/profile/edit")}>
                ⚙️
              </button>
			  {/* will add the logout to settings later */}
              {/* <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item> */}

        </Col>
      </Row>
    </div>
  );
}
