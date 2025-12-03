import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Row, Col } from "react-bootstrap";
import { signOut } from "next-auth/react";

const ProfileLayout = ({ children, user }) => {
  const router = useRouter();
  const [aiDisabled, setAiDisabled] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("aiDisabled");
      setAiDisabled(v === "true");
    } catch {}
  }, []);
  // handleLogout must be inside the component
  const handleLogout = async () => {
    const ok = window.confirm("Log out of your account?");
    if (!ok) return;
    try {
      const token = localStorage.getItem("userToken");

      await fetch("/api/users/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      await signOut({ redirect: false });
      localStorage.removeItem("userToken");

      router.push("/login"); // router is in scope
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem("userToken");
      router.push("/login"); // router is in scope
    }
  };
  const handleToggleAI = () => {
    const newVal = !aiDisabled;
    const ok = window.confirm(
      newVal
        ? "Disable AI features across the app? You can re-enable later."
        : "Re-enable AI features across the app?"
    );
    if (!ok) return;
    try {
      if (newVal) {
        localStorage.setItem("aiDisabled", "true");
        setAiDisabled(true);
        alert("AI features disabled for this browser.");
      } else {
        localStorage.removeItem("aiDisabled");
        setAiDisabled(false);
        alert("AI features re-enabled.");
      }
    } catch (e) {
      alert("Failed to update AI setting. Please try again.");
    }
  };
  const menuItems = [
    { name: "Notifications", path: "/profile/notifications" },
    { name: "Edit Information", path: "/profile/edit" },
    { name: "Change Password", path: "/profile/change-password" },
    { name: "Delete Account", path: "/profile/delete" },
    { name: aiDisabled ? "Enable AI" : "Disable AI", onClick: handleToggleAI },
    { name: "Log Out", onClick: handleLogout },
  ];

  return (
    <Row>
      {/* Left Sidebar */}
      <Col md={2} className="mainpage-left">
        <aside>
          <p className="left-right-title">Settings</p>
          <nav>
            <ul style={{ padding: 0, marginTop: "20px" }}>
              {menuItems
                .filter((item) => {
                  if (
                    user?.googleId &&
                    item.path === "/profile/change-password"
                  ) {
                    return false;
                  }
                  return true;
                })
                .map((item) => {
                  const isActive = item.path && router.pathname === item.path;
                  return (
                    <li
                      key={item.name}
                      style={{ listStyle: "none", marginBottom: "10px" }}
                    >
                      {item.path ? (
                        <Link
                          href={item.path}
                          style={{
                            textDecoration: "none",
                            display: "block",
                            padding: "8px 10px",
                            borderRadius: "4px",
                            fontWeight: isActive ? "bold" : "normal",
                            backgroundColor: isActive
                              ? "#f0f0f0"
                              : "transparent",
                            color: isActive ? "#333" : "#666",
                          }}
                        >
                          {item.name}
                        </Link>
                      ) : item.onClick ? (
                        <button
                          type="button"
                          onClick={item.onClick}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "8px 10px",
                            borderRadius: "4px",
                            border: "none",
                            backgroundColor: "transparent",
                            color: "#666",
                            cursor: "pointer",
                          }}
                        >
                          {item.name}
                        </button>
                      ) : null}
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
