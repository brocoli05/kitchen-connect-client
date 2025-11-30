// pages/admin/hidden-recipes.jsx
import React, { useEffect, useState } from "react";
import TopNavBar from "@/components/TopNavBar";

export default function HiddenRecipesPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state for preview
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalPost, setModalPost] = useState(null);
  const [modalReports, setModalReports] = useState([]);

  // Load hidden posts list
  const loadData = async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const meRes = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me = meRes.ok ? await meRes.json() : null;
      setCurrentUser(me);

      const isAdmin =
        me &&
        (me.role === "admin" ||
          me.isAdmin === true ||
          me.isAdmin === "true");

      if (!isAdmin) {
        setItems([]);
        return;
      }

      const res = await fetch("/api/admin/hidden-posts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("failed to load hidden posts", res.status);
        setItems([]);
        return;
      }

      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      console.error("hidden recipes load error", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isAdmin =
    currentUser &&
    (currentUser.role === "admin" ||
      currentUser.isAdmin === true ||
      currentUser.isAdmin === "true");

  // Open preview modal for a specific post
  const openPreview = async (postId) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) return;

    setModalOpen(true);
    setModalLoading(true);
    setModalError("");
    setModalPost(null);
    setModalReports([]);

    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setModalError(data.message || `Failed to load post (status ${res.status})`);
        return;
      }

      const data = await res.json();
      setModalPost(data.post);
      setModalReports(data.reports || []);
    } catch (e) {
      console.error("preview load error", e);
      setModalError("Failed to load post details.");
    } finally {
      setModalLoading(false);
    }
  };

  if (currentUser && !isAdmin) {
    return (
      <>
        <TopNavBar />
        <div style={{ padding: 24 }}>Admin access only.</div>
      </>
    );
  }

  return (
    <>
      <TopNavBar />
      <div style={{ maxWidth: 900, margin: "72px auto", padding: "0 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          Hidden Recipes
        </h1>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
          These recipes are hidden from public feeds and search. You can preview
          them here, then unhide or permanently delete them.
        </p>

        {loading ? (
          <div>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No hidden recipes.</div>
        ) : (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead
                style={{
                  backgroundColor: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Title
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Author
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Hidden at
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "10px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 12px", fontSize: 14 }}>
                      {/* Clickable title -> open preview modal */}
                      <button
                        type="button"
                        onClick={() => openPreview(p.id)}
                        style={{
                          all: "unset",
                          cursor: "pointer",
                          color: "#2563eb",
                          textDecoration: "underline",
                        }}
                      >
                        {p.title}
                      </button>
                    </td>
                    <td style={{ padding: "8px 12px", fontSize: 13 }}>
                      {p.authorName}
                    </td>
                    <td style={{ padding: "8px 12px", fontSize: 13 }}>
                      {p.hiddenAt
                        ? new Date(p.hiddenAt).toLocaleString()
                        : ""}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                        fontSize: 13,
                      }}
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          const token =
                            typeof window !== "undefined"
                              ? localStorage.getItem("userToken")
                              : null;
                          if (!token) return;
                          const ok = window.confirm(
                            "Unhide this recipe for all users?"
                          );
                          if (!ok) return;
                          try {
                            const res = await fetch(
                              `/api/admin/posts/${p.id}/unhide`,
                              {
                                method: "POST",
                                headers: { Authorization: `Bearer ${token}` },
                              }
                            );
                            if (res.ok) {
                              await loadData();
                            } else {
                              const data = await res.json().catch(() => ({}));
                              alert(
                                data.message ||
                                  `Unhide failed (status ${res.status})`
                              );
                            }
                          } catch (e) {
                            console.error("unhide error", e);
                          }
                        }}
                        style={{
                          marginRight: 8,
                          borderRadius: 9999,
                          border: "none",
                          padding: "5px 10px",
                          backgroundColor: "#10b981",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        Unhide
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const token =
                            typeof window !== "undefined"
                              ? localStorage.getItem("userToken")
                              : null;
                          if (!token) return;
                          const ok = window.confirm(
                            "Delete this recipe permanently?"
                          );
                          if (!ok) return;
                          try {
                            const res = await fetch(
                              `/api/admin/posts/${p.id}/delete`,
                              {
                                method: "POST",
                                headers: { Authorization: `Bearer ${token}` },
                              }
                            );
                            if (res.ok) {
                              await loadData();
                            } else {
                              const data = await res.json().catch(() => ({}));
                              alert(
                                data.message ||
                                  `Delete failed (status ${res.status})`
                              );
                            }
                          } catch (e) {
                            console.error("delete error", e);
                          }
                        }}
                        style={{
                          borderRadius: 9999,
                          border: "none",
                          padding: "5px 10px",
                          backgroundColor: "#ef4444",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Simple modal for preview */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(800px, 95vw)",
              maxHeight: "80vh",
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 20,
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 20 }}>
                {modalPost ? modalPost.title : "Post preview"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {modalLoading && <div>Loading post…</div>}
            {modalError && (
              <div style={{ color: "red", marginBottom: 8 }}>{modalError}</div>
            )}

            {modalPost && !modalLoading && !modalError && (
              <>
                <p style={{ color: "#6b7280", fontSize: 14 }}>
                  Author: <b>{modalPost.authorName}</b>{" "}
                  {modalPost.createdAt && (
                    <>
                      · Created:{" "}
                      {new Date(modalPost.createdAt).toLocaleString()}
                    </>
                  )}
                  {modalPost.hiddenReason && (
                    <>
                      {" "}
                      · Hidden reason:{" "}
                      <span style={{ fontStyle: "italic" }}>
                        {modalPost.hiddenReason}
                      </span>
                    </>
                  )}
                </p>

                {modalPost.photo && (
                  <img
                    src={modalPost.photo}
                    alt="Post photo"
                    style={{
                      maxWidth: "100%",
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                  />
                )}

                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    backgroundColor: "#f9fafb",
                  }}
                >
                  {modalPost.content || "(no content)"}
                </div>

                <h3 style={{ fontSize: 16, marginBottom: 8 }}>
                  Reports ({modalReports.length})
                </h3>
                {modalReports.length === 0 ? (
                  <p style={{ color: "#9ca3af", fontSize: 14 }}>
                    No reports for this post.
                  </p>
                ) : (
                  <ul style={{ paddingLeft: 18, fontSize: 14 }}>
                    {modalReports.map((r) => (
                      <li key={r.id} style={{ marginBottom: 8 }}>
                        <div>
                          <b>Reason:</b> {r.reason}
                        </div>
                        {r.details && (
                          <div>
                            <b>Details:</b> {r.details}
                          </div>
                        )}
                        <div style={{ color: "#6b7280", fontSize: 12 }}>
                          Reporter: {r.reporterName} ·{" "}
                          {r.createdAt
                            ? new Date(r.createdAt).toLocaleString()
                            : "unknown time"}
                          {r.source && ` · source: ${r.source}`}
                          {r.status && ` · status: ${r.status}`}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}