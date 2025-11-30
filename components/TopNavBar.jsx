import React, { useState } from "react";
import { useRouter } from "next/router";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Button, Dropdown } from "react-bootstrap";
import { signOut } from "next-auth/react";

export default function TopNavBar({}) {
  const router = useRouter();


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
            <Button className="list-link d-flex justify-content-center" href="/posts/favorite">🔖 Favorite</Button>
            <Button className="list-link d-flex justify-content-center" href="#/action-3">📙 Lists </Button>
			<Button className="list-link d-flex justify-content-center" href="/history">👣 History</Button>
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
			 style={{backgroundColor: "transparent", border: "none", fontSize: "35px", marginLeft: "12px"}} 
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
