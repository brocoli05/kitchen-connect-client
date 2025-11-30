import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Button, Dropdown } from "react-bootstrap";
import { signOut } from "next-auth/react";
import { useProfile } from "../context/ProfileContext";

export default function TopNavBar({}) {
  const router = useRouter();
  const { profileImage, setProfileImage } = useProfile();

  useEffect(() => {
    const fetchProfileImage = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;

      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.profileImage) {
            setProfileImage(`${data.profileImage}?t=${Date.now()}`);
          } else {
            setProfileImage("/avatar.png");
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile image:", err);
      }
    };

    fetchProfileImage();
  }, []);


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
            onClick={() => router.push("/posts/favorite")}
            className="me-3 rounded-3 d-flex align-items-center justify-content-center btn btn-link fw-bold"
            style={{
              textDecoration: "none",
              color: "#FFFFFF",
              backgroundColor: "#000000ff",
              border: "none",
              height: "40px",
              width: "106px",
            }}
            type="button"
          >
            Favorites
          </button>

          <button
            onClick={() => router.push("/profile/edit")}
            className=" d-flex align-items-center h-100 justify-content-center btn btn-link"
          >
            <img
              className="rounded-circle"
              src={profileImage}
              alt="User Avatar"
              style={{ width: "35px", height: "35px" }}
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
