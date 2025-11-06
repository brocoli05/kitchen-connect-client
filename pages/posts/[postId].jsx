// pages/posts/[postId].jsx
import Link from "next/link";
import CommentSection from "@/components/CommentSection";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import api from "@/utils/api";
import TopNavBar from "@/components/TopNavBar";
import { Row, Col } from "react-bootstrap";
import st from "@/styles/createPost.module.css";

/**
 * Post detail page: shows a single post, supports favorite/save,
 * owner-only edit/delete, and optional image update via FormData.
 */
export default function PostPage({ post, notFound, postIdFromProps }) {
  const router = useRouter();
  const postId = post?.id || postIdFromProps;

  // auth / ownership / edit state
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // edit form state
  const [form, setForm] = useState({
    title: post?.title || "",
    content: post?.content || "",
  });
  const [errors, setErrors] = useState({});

  // favorite state
  const [isFavorited, setIsFavorited] = useState(false);

  // optional image update
  const [selectedImage, setSelectedImage] = useState(null);

  // Load current user and determine ownership
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) return;

    fetch(`/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCurrentUser(data);
        if (data && post?.authorId && String(data.id) === String(post.authorId)) {
          setIsOwner(true);
        }
      })
      .catch(() => {});
  }, [post]);

  // Load favorite status
  useEffect(() => {
    if (!postIdFromProps) return;
    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) return;

    (async () => {
      try {
        const res = await api.get(`posts/${postIdFromProps}/isFavorite`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsFavorited(!!res.data?.isFavorited);
      } catch (error) {
        console.error("Failed to get favorite status", error);
      }
    })();
  }, [postIdFromProps]);

  // Toggle favorite
  const handleSaveButton = async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) return;

    try {
      const res = await api.post(`posts/${postIdFromProps}/favorite`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsFavorited(!!res.data?.isFavorited);
    } catch (error) {
      console.error("Failed to toggle favorite", error);
    }
  };

  // Guard: not found
  if (notFound || !post) {
    return (
      <>
        <TopNavBar />
        <div style={{ padding: 24 }}>
          <p>Post not found.</p>
          <Link href="/">← Back</Link>
        </div>
      </>
    );
  }

  // --- Owner actions: Edit/Delete ---

  /** Begin edit mode with current post content */
  const startEdit = () => {
    setForm({ title: post.title || "", content: post.content || "" });
    setErrors({});
    setSelectedImage(null);
    setIsEditing(true);
  };

  /** Cancel edit and reset form/image/error state */
  const cancelEdit = () => {
    setIsEditing(false);
    setErrors({});
    setSelectedImage(null);
    const fileInput = document.getElementById("imageUpload");
    if (fileInput) fileInput.value = "";
  };

  /** Controlled inputs for edit form */
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((s) => ({ ...s, [name]: "" }));
  };

  /** Handle image file selection and basic validation */
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedImage(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB.");
      e.target.value = "";
      return;
    }
    setSelectedImage(file);
  };

  /** Remove the selected image before saving */
  const removeImage = () => {
    setSelectedImage(null);
    const fileInput = document.getElementById("imageUpload");
    if (fileInput) fileInput.value = "";
  };

  /** Persist edits. If image present, use FormData; else JSON */
  const saveEdit = async () => {
    // client-side validation
    const newErrors = {};
    if (!form.title || form.title.trim() === "") newErrors.title = "Title is required";
    if (!form.content || form.content.trim() === "") newErrors.content = "Content is required";
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;

    try {
      let resp;
      if (selectedImage) {
        // Use multipart/form-data for image update
        const formData = new FormData();
        formData.append("title", form.title);
        formData.append("content", form.content);
        formData.append("photo", selectedImage);

        resp = await fetch(`/api/posts/${postId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }, // do not set Content-Type
          body: formData,
        });
      } else {
        // JSON-only update
        resp = await fetch(`/api/posts/${postId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: form.title, content: form.content }),
        });
      }

      const data = await resp.json();
      if (!resp.ok) {
        alert(data?.message || "Failed to update post");
        return;
      }

      // Optimistic UI update
      post.title = data.title ?? post.title;
      post.content = data.content ?? post.content;
      if (data.photo || data.photoUrl) {
        post.photo = data.photo ?? data.photoUrl;
      }

      setIsEditing(false);
      setSelectedImage(null);
      alert("Post updated");

      // Optional: hard reload to ensure fresh data (e.g., image base64 changes)
      window.location.reload();
    } catch (e) {
      console.error("Update failed", e);
      alert("Failed to update post. Please try again.");
    }
  };

  /** Delete post (owner only) */
  const handleDelete = async () => {
    const ok = window.confirm(
      "Are you sure you want to delete this post? This action cannot be undone."
    );
    if (!ok) return;

    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;

    try {
      const resp = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        const data = await resp.json();
        alert(data?.message || "Failed to delete post");
        return;
      }

      alert("Post deleted");
      router.push("/");
    } catch (e) {
      console.error(e);
      alert("Failed to delete post. Please try again.");
    }
  };

  // simple shared badge style for meta fields
  const badgeStyle = {
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    borderRadius: 9999,
    padding: "4px 10px",
    fontSize: 12,
  };

  return (
    <>
      <TopNavBar />
      <div style={{ maxWidth: 820, margin: "72px auto", padding: "0 16px" }}>
        <Link href="/">← Back</Link>

        <h1 style={{ margin: "16px 0 8px" }}>{post.title}</h1>

        {/* Meta badges (optional fields if present) */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 12px" }}>
          {post?.difficulty && <span style={badgeStyle}>Difficulty: {post.difficulty}</span>}
          {Number.isFinite(post?.timeMax) && <span style={badgeStyle}>Max: {post.timeMax} min</span>}
          {post?.dietary && <span style={badgeStyle}>Dietary: {post.dietary}</span>}
          {post?.include && <span style={badgeStyle}>Include: {post.include}</span>}
          {post?.exclude && <span style={badgeStyle}>Exclude: {post.exclude}</span>}
        </div>

        {/* Created at + Favorite */}
        {post.createdAt && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ color: "#666", marginTop: 0 }}>
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </p>
            <button
              onClick={handleSaveButton}
              style={{
                padding: "8px 16px",
                fontSize: 16,
                border: "1px solid #333",
                borderRadius: 4,
                backgroundColor: isFavorited ? "#333" : "#fff",
                color: isFavorited ? "#fff" : "#333",
                cursor: "pointer",
                fontWeight: isFavorited ? "bold" : "normal",
              }}
            >
              {isFavorited ? "Saved" : "Save"}
            </button>
          </div>
        )}

        {/* Post content */}
        <article
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
            background: "#fafafa",
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 16,
          }}
        >
          {post.content}
        </article>

        {/* Optional image */}
        <br />
        {!!(post.photo || post.photoUrl) && (
          <div>
            <img
              src={post.photo || post.photoUrl}
              alt=""
              style={{ maxWidth: "100%", borderRadius: 8 }}
            />
          </div>
        )}
        <br />

        {/* Owner-only actions */}
        {isOwner && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexDirection: "column" }}>
            {!isEditing ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={startEdit}
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: 6,
                  }}
                >
                  Edit Post
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    background: "#e53e3e",
                    color: "#fff",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: 6,
                  }}
                >
                  Delete Post
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 12, width: "100%" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input
                    name="title"
                    value={form.title}
                    onChange={onChange}
                    placeholder="Title"
                    style={{ padding: 8, fontSize: 16 }}
                  />
                  {errors.title && <div style={{ color: "red" }}>{errors.title}</div>}

                  <textarea
                    name="content"
                    value={form.content}
                    onChange={onChange}
                    rows={8}
                    placeholder="Content"
                    style={{ padding: 8 }}
                  />
                  {errors.content && <div style={{ color: "red" }}>{errors.content}</div>}

                  {/* Image upload for edit */}
                  <Row className={st.imageUploadSection}>
                    <Col md={3}>
                      <label htmlFor="imageUpload">Add Photo (Optional):</label>
                    </Col>
                    <Col md={9}>
                      <input
                        type="file"
                        id="imageUpload"
                        accept="image/*"
                        onChange={handleImageChange}
                        style={{ margin: "10px 0", display: "block" }}
                      />
                      {selectedImage && (
                        <div
                          style={{
                            marginTop: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <span
                            style={{
                              color: "#28a745",
                              fontSize: "14px",
                              fontWeight: "500",
                            }}
                          >
                            ✓ {selectedImage.name}
                          </span>
                          <button
                            type="button"
                            onClick={removeImage}
                            style={{
                              background: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </Col>
                  </Row>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={saveEdit}
                      style={{
                        background: "#10b981",
                        color: "#fff",
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: 6,
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        background: "#6b7280",
                        color: "#fff",
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: 6,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comments */}
        <hr style={{ margin: "40px 0", borderTop: "1px solid #ddd" }} />
        <section className="comments-section">
          <h2 style={{ marginBottom: 20 }}>Comments</h2>
          {postId && <CommentSection postId={postId} />}
        </section>
      </div>
    </>
  );
}

/**
 * SSR: fetch post detail for the given postId param.
 * Returns notFound flag if API returns non-OK.
 */
export async function getServerSideProps({ params, req }) {
  const base = `http://${req?.headers?.host || "localhost:3000"}`;
  try {
    const r = await fetch(`${base}/api/posts/${params.postId}`);
    if (!r.ok) return { props: { notFound: true } };
    const post = await r.json();
    return { props: { post, postIdFromProps: params.postId } };
  } catch {
    return { props: { notFound: true } };
  }
}