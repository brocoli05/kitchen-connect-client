// pages/messages/index.jsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import TopNavBar from "@/components/TopNavBar";

export default function MessagesHome() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Load current user
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) return;

    fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCurrentUser(data))
      .catch(() => {});
  }, []);

  // Load conversation list
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) return;

    fetch("/api/chat", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.items) setConversations(data.items);
      })
      .catch((e) => console.error("failed to load conversations", e));
  }, []);

  // Search users by name / username for starting a new conversation
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) return;

    const timeout = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(search.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.items || []);
        }
      } catch (e) {
        console.error("user search failed", e);
      } finally {
        setSearchLoading(false);
      }
    }, 250); // small debounce

    return () => clearTimeout(timeout);
  }, [search]);

  const openConversation = (peerId) => {
    router.push(`/messages/${peerId}`);
  };

  return (
    <>
      <TopNavBar />
      <div
        style={{
          height: "calc(100vh - 64px)",
          paddingTop: 8,
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            height: "100%",
            display: "flex",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
            backgroundColor: "#fff",
          }}
        >
          {/* LEFT: conversation list + search */}
          <div
            style={{
              width: 320,
              borderRight: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "16px 16px 8px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                Messages
              </h2>
              <div
                style={{
                  marginTop: 12,
                  position: "relative",
                }}
              >
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users"
                  style={{
                    width: "100%",
                    borderRadius: 9999,
                    border: "1px solid #d1d5db",
                    padding: "8px 12px",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                {/* Dropdown for user search */}
                {search && (searchResults.length > 0 || searchLoading) && (
                  <div
                    style={{
                      position: "absolute",
                      top: "110%",
                      left: 0,
                      right: 0,
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
                      zIndex: 20,
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    {searchLoading && (
                      <div style={{ padding: 8, fontSize: 13, color: "#6b7280" }}>
                        Searching…
                      </div>
                    )}
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => openConversation(u.id)}
                        style={{
                          all: "unset",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          width: "100%",
                          cursor: "pointer",
                        }}
                      >
                        <img
                          src={u.avatarUrl || "/avatar.png"}
                          alt=""
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>
                            {u.name || u.username}
                          </div>
                          {u.username && (
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              @{u.username}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                    {!searchLoading && searchResults.length === 0 && (
                      <div style={{ padding: 8, fontSize: 13, color: "#9ca3af" }}>
                        No users found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Conversation list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {conversations.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    fontSize: 13,
                    color: "#9ca3af",
                  }}
                >
                  No conversations yet.
                </div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.peerId}
                    type="button"
                    onClick={() => openConversation(c.peerId)}
                    style={{
                      all: "unset",
                      width: "100%",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 16px",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <img
                        src={c.avatarUrl || "/avatar.png"}
                        alt=""
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                            }}
                          >
                            {c.name || c.username}
                          </span>
                          {c.lastAt && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#9ca3af",
                                marginLeft: 8,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {new Date(c.lastAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.lastText || "No messages yet"}
                        </div>
                      </div>
                      {c.unreadCount > 0 && (
                        <div
                          style={{
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9999,
                            backgroundColor: "#ef4444",
                            color: "#fff",
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {c.unreadCount}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: empty state */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "radial-gradient(circle at top, #f9fafb 0, #f3f4f6 45%, #e5e7eb 100%)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "#374151",
                }}
              >
                Select a conversation
              </div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Choose someone from the left to start chatting.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}