// pages/messages/[peerId].jsx
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import TopNavBar from "@/components/TopNavBar";

export default function ConversationPage() {
  const router = useRouter();
  const { peerId } = router.query;

  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [peerInfo, setPeerInfo] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const bottomRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length]);

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

  // Load messages with this peer
  useEffect(() => {
    if (!peerId) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) return;

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await fetch(`/api/chat/${peerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.items || []);
          if (data.peer) setPeerInfo(data.peer);
        }
      } catch (e) {
        console.error("failed to load messages", e);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [peerId]);

  // User search for starting new conversation
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
    }, 250);

    return () => clearTimeout(timeout);
  }, [search]);

  const openConversation = (id) => {
    router.push(`/messages/${id}`);
  };

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !peerId) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) {
      alert("Please log in to send messages.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/chat/${peerId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        throw new Error("Failed to send");
      }

      const data = await res.json();
      // Append new message to list
      setMessages((prev) => [...prev, data]);
      setText("");
    } catch (e) {
      console.error("send failed", e);
      alert("Failed to send.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // Enter sends, Shift+Enter adds newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
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
                maxWidth: "1600px",     
                width: "100%",
                margin: "0 auto",
                padding: "0 24px",      
                boxSizing: "border-box",
                height: "100%",
                display: "flex",
                gap: 24,                
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
                backgroundColor: "#fff",
            }}
            >
          {/* LEFT: conversations + search (same as index) */}
          <div
            style={{
              width: 360,
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
                      backgroundColor: c.peerId === peerId ? "#f3f4f6" : "transparent",
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

          {/* RIGHT: conversation */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#f9fafb",
            }}
          >
            {/* Header with peer info */}
            <div
              style={{
                padding: "12px 20px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img
                  src={peerInfo?.avatarUrl || "/avatar.png"}
                  alt=""
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {peerInfo?.name || peerInfo?.username || "Conversation"}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>Direct message</div>
                </div>
              </div>
            </div>

            {/* Messages list */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 20px",
              }}
            >
              {loadingMessages ? (
                <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</div>
              ) : messages.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13 }}>
                  Start the conversation by sending a message.
                </div>
              ) : (
                messages.map((m) => {
                  const isMine =
                    currentUser && String(m.senderId) === String(currentUser.id);
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: isMine ? "flex-end" : "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "70%",
                          borderRadius: 18,
                          padding: "8px 12px",
                          fontSize: 14,
                          lineHeight: 1.4,
                          backgroundColor: isMine ? "#111827" : "#e5e7eb",
                          color: isMine ? "#fff" : "#111827",
                        }}
                      >
                        {m.text}
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 10,
                            color: isMine ? "#9ca3af" : "#6b7280",
                            textAlign: isMine ? "right" : "left",
                          }}
                        >
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              style={{
                padding: "10px 16px",
                borderTop: "1px solid #e5e7eb",
                backgroundColor: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your message"
                  rows={1}
                  style={{
                    flex: 1,
                    resize: "none",
                    borderRadius: 9999,
                    border: "1px solid #d1d5db",
                    padding: "8px 14px",
                    fontSize: 14,
                    outline: "none",
                    maxHeight: 80,
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  style={{
                    borderRadius: 9999,
                    border: "none",
                    padding: "8px 16px",
                    fontSize: 14,
                    fontWeight: 500,
                    backgroundColor: sending || !text.trim() ? "#d1d5db" : "#111827",
                    color: "#fff",
                    cursor: sending || !text.trim() ? "default" : "pointer",
                  }}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}