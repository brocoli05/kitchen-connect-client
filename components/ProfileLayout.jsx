import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Row, Col } from "react-bootstrap";

// Define the sidebar menu items
const menuItems = [
  { name: "Edit Information", path: "/profile/edit" },
  { name: "Delete Account", path: "/profile/delete" },
];

const ProfileLayout = ({ children }) => {
  const router = useRouter();

  return (
    <Row>
      {/* Left Sidebar */}
      <Col md={2} className="mainpage-left">
        <aside>
          <p className="left-right-title">Profile</p>
          <nav>
            <ul>
              {menuItems.map((item) => {
                const isActive = router.pathname === item.path;
                return (
                  <li
                    key={item.path}
                    style={{ listStyle: "none", marginBottom: "10px" }}
                  >
                    <Link
                      href={item.path}
                      style={{
                        textDecoration: "none",
                        display: "block",
                        padding: "8px 10px",
                        borderRadius: "4px",
                        fontWeight: isActive ? "bold" : "normal",
                        backgroundColor: isActive ? "#f0f0f0" : "transparent",
                        color: isActive ? "#333" : "#666",
                      }}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
      </Col>

      <Col md={10}>
        <main>{children}</main>
      </Col>
    </Row>
  );
};

export default ProfileLayout;
