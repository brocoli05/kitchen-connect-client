import React from "react";
import { useRouter } from "next/router";

function ToggleList({ title }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="mainpage-left-toggle-list">
      <button onClick={() => setOpen((prev) => !prev)} className="list-title">
        {title}
      </button>
      {open && title === "Discover" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>
            <a href="#/action-1">Home</a>
          </li>
          <li>
            <a href="#/action-2">Browse</a>
          </li>
          <li>
            <a href="#/action-3">Explore</a>
          </li>
        </ul>
      )}
      {open && title === "Personal" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>
            <a href="#/action-1">Notifications</a>
          </li>
          <li>
            <a href="/posts/favorite">Favorites</a>
          </li>
          <li>
            <a href="#/action-3">Lists</a>
          </li>
          <li>
            <a href="/history">History</a>
          </li>
        </ul>
      )}
      {open && title === "Kitchen" && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>
            <a href="/recipes">Recipes</a>
          </li>
          <li>
            <a href="#/action-2">Recommended</a>
          </li>
          <li>
            <a href="#/action-3">Trending</a>
          </li>
          <li>
            <a href="#/action-4">Resources</a>
          </li>
        </ul>
      )}
    </div>
  );
}

export default function LeftSidebar() {
  const router = useRouter();
  return (
    <div className="mainpage-left">
      <p className="left-right-title">Feed</p>
      <ToggleList title="Discover" />
      <ToggleList title="Personal" />
      <ToggleList title="Kitchen" />
      <div className="d-flex justify-content-center mt-3">
        <button
          className="post-button"
          onClick={() => router.push("/posts/create")}
        >
          Post
        </button>
      </div>
    </div>
  );
}
