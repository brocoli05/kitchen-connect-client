import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Dropdown } from "react-bootstrap";
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

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("userToken");

      await fetch("/api/users/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await signOut({ redirect: false });

      localStorage.removeItem("userToken");

      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still logout even if API fails
      localStorage.removeItem("userToken");
      router.push("/login");
    }
  };
  return (
    <div>
      <Row className="m-3 d-flex align-items-center topnav">
        <Col md={8} className="d-flex justify-content-start topnav-left">
          <a className="fw-bold active" href="/mainpage">
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
              height: "35px",
              width: "86px",
            }}
            type="button"
          >
            Favorites
          </button>
          {/* <button
            onClick={() => router.push("/share")}
            className="me-3 rounded-3 d-flex align-items-center justify-content-center btn btn-link fw-bold"
            style={{
              textDecoration: "none",
              color: "#FFFFFF",
              backgroundColor: "#000000ff",
              border: "none",
              height: "35px",
              width: "56px",
            }}
            type="button"
          >
            Share
          </button> */}
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
          <Dropdown className="me-3 rounded-3 d-flex align-items-center justify-content-center">
            <Dropdown.Toggle
              variant="light"
              className="fw-bold "
              style={{
                // width: "46px",
                backgroundColor: "#EEEEEE",
                border: "none",
                fontSize: "1.5rem",
                color: "#333",
                height: "35px",
                width: "56px",
              }}
              id="dropdown-settings"
            ></Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.Item onClick={() => router.push("/profile/edit")}>
                Settings…
              </Dropdown.Item>
              <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>
    </div>
  );
}
