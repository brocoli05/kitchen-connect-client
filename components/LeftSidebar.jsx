import React from "react";
import { Row, Col } from "react-bootstrap";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import PostCard from "@/components/PostCard";
import Link from "next/link";
const GEOLOCATION_TIMEOUT = 8000;

function ToggleList({ title, isAdmin }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mainpage-left-toggle-list">
      <Row
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        onClick={() => setOpen((prev) => !prev)}
        className="list-title"
      >
        <span style={{ width: "80%" }}>{title}</span>

        <span
          style={{ fontSize: "20px", width: "20%", fontFamily: "monospace" }}
        >
          {open ? "⌃" : "⌄"}
        </span>
      </Row>
      {open && title === "Discover" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li className="list-item">
            <a className="list-link" href="/">
              <span style={{ marginRight: "18px" }}>🏠</span>
              Home
            </a>
          </li>
          <li className="list-item">
            <Link className="list-link" href="/browse">
              <span style={{ marginRight: "18px" }}>🔎</span>
              Browse
            </Link>
          </li>
          <li className="list-item">
            <a className="list-link" href="/explore">
              <span style={{ marginRight: "18px" }}>🌎</span>Explore
            </a>
          </li>
        </ul>
      )}
      {/* {open && title === "Personal" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li className="list-item">
            <a className="list-link" href="#/action-1"><span style={{ marginRight: "18px" }}>🔔</span>Notifications</a>
          </li>
          <li className="list-item">
            <a className="list-link" href="/posts/favorite"><span style={{ marginRight: "18px" }}>🔖</span>Favorites</a>
          </li>
          <li className="list-item">
            <a className="list-link" href="#/action-3"><span style={{ marginRight: "18px" }}>📙</span>Lists</a>
          </li>
          <li className="list-item">
            <a className="list-link" href="/history"><span style={{ marginRight: "18px" }}>👣</span>History</a>
          </li>
        </ul>
      )} */}
      {open && title === "Kitchen" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li className="list-item">
            <a className="list-link" href="/recipes">
              <span style={{ marginRight: "18px" }}>🍎</span>Recipes
            </a>
          </li>
          <li className="list-item">
            <Link className="list-link" href="/messages">
              <span style={{ marginRight: "18px" }}>💬</span>
              Messages
            </Link>
          </li>
          <li className="list-item">
            <a className="list-link" href="/trending">
              <span style={{ marginRight: "18px" }}>🔥</span>Trending
            </a>
          </li>
          {/* Admin-only menu item */}
          {isAdmin && (
            <li className="list-item">
              <a className="list-link" href="/admin/hidden-recipes">
                <span style={{ marginRight: "18px" }}>🙈</span>
                Blocked
              </a>
            </li>
          )}
          <li className="list-item">
            <button
              onClick={() => openGoogleMaps()}
              style={{
                border: "none",
                backgroundColor: "inherit",
              }}
              className="list-link"
            >
              <span style={{ marginRight: "18px" }}>🥕</span>Resources
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
// Open Google Maps directly. If geolocation is available and permitted, center on user's location.
const openGoogleMaps = (query = "grocery store") => {
  const q = encodeURIComponent(query || "grocery store");

  const openUrl = (lat, lng) => {
    let url;
    if (lat != null && lng != null) {
      url = `https://www.google.com/maps/search/${q}/@${lat},${lng},14z`;
    } else {
      url = `https://www.google.com/maps/search/${q}`;
    }
    window.open(url, "_blank");
  };

  if (typeof navigator !== "undefined" && navigator.geolocation) {
    const called = { v: false };
    const timer = setTimeout(() => {
      if (!called.v) {
        called.v = true;
        openUrl(); // fallback without coords
      }
    }, GEOLOCATION_TIMEOUT);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (called.v) return;
        called.v = true;
        clearTimeout(timer);
        openUrl(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        if (called.v) return;
        called.v = true;
        clearTimeout(timer);
        openUrl();
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  } else {
    // No geolocation available
    openUrl();
  }
};

export default function LeftSidebar({ isAdmin }) {
  const router = useRouter();

  return (
    <>
      <p className="left-right-title">Feed</p>
      <ToggleList title="Discover" />
      {/* <ToggleList title="Personal" /> */}
      <ToggleList title="Kitchen" isAdmin={isAdmin} />
      <Row className="d-flex justify-content-center">
        <button
          className="post-button "
          onClick={() => router.push("/posts/create")}
        >
          Post
        </button>
      </Row>
    </>
  );
}
