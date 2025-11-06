// pages/posts/[postId].jsx
import Link from "next/link";
import CommentSection from "@/components/CommentSection";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import api from "../../utils/api";
import TopNavBar from "@/components/TopNavBar";
import { Row, Col } from "react-bootstrap";
import styles from "@/styles/postDetail.module.css"; // ← new CSS module

export default function PostPage({ post, notFound, postIdFromProps }) {
  const router = useRouter();
  const postId = post?.id;

  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    title: post?.title || "",
    content: post?.content || "",
  });
  const [errors, setErrors] = useState({});
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const [repostWorking, setRepostWorking] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repostCount || 0);
  const [isReposted, setIsReposted] = useState(false);

  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [liked, setLiked] = useState(false);

  // Early 404 guard
  if (notFound || !post) {
    return (
      <div className={styles.fallback}>
        <p>User not found.</p>
        <Link className={styles.backLink} href="/">← Back</Link>
      </div>
    );
  }

  // Load current user & ownership
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

  // Restore cached userInfo (optional)
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      if (userInfo) setCurrentUser(userInfo);
    } catch (e) {
      console.error("Failed to parse user info:", e);
    }
  }, []);

  // Initial liked state
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      if (userInfo && post.likedBy?.[userInfo.id]) setLiked(true);
    } catch {}
  }, [post]);

  // Favorite status
  useEffect(() => {
    const checkFavorite = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;
      try {
        const res = await api.get(`posts/${postIdFromProps}/isFavorite`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsFavorited(res.data?.isFavorited ?? false);
      } catch (error) {
        console.error("Failed to get favorite state:", error);
      }
    };
    if (postIdFromProps) checkFavorite();
  }, [postIdFromProps]);

  // Toggle favorite
  const handleSaveButton = async () => {
    const token = localStorage.getItem("userToken");
    if (!token) return;

    try {
      const resp = await fetch(`/api/posts/${postIdFromProps}/favorite`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error("Favorite failed:", resp.status, text);
        alert(`Favorite failed: ${resp.status}`);
        return;
      }

      const data = await resp.json();
      setIsFavorited(data?.isFavorited ?? false);
    } catch (e) {
      console.error("Favorite error:", e);
      alert("Network error while favoriting.");
    }
  };



  const handleRepost = async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) {
      alert("Please sign in to repost.");
      router.push("/login");
      return;
    }

    try {
      const resp = await fetch(`/api/posts/${postId}`, {
        method: "GET",
      });
      if (!resp.ok) {
        alert("Post not found.");
        return;
      }

      const r = await fetch(`/api/posts/${postId}/repost`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();

      if (!r.ok) {
        alert(data?.message || "Failed to repost.");
        return;
      }

      alert("Reposted!");
      // Go to new repost page if id is present
      if (data?.id) {
        router.push(`/posts/${data.id}`);
      }
    } catch (err) {
      console.error("Repost failed:", err);
      alert("Repost failed. Please try again.");
    }
  };

  // Toggle repost (non-owner)
  const toggleRepost = async () => {
    try {
      setRepostWorking(true);
  
      const token = localStorage.getItem("userToken");
      const res = await fetch(`/api/posts/${postId}/repost`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      const data = await res.json();
  
      if (res.ok) {
        // Update UI states
        setIsReposted(data.isReposted);
        setRepostCount(data.repostCount);
  
        // Success alert
        alert(data.isReposted ? "Repost removed." : "Repost successful!");
      } else {
        alert(data.message || "Failed to repost.");
      }
    } catch (err) {
      console.error("Repost error:", err);
      alert("An error occurred while reposting.");
    } finally {
      setRepostWorking(false);
    }
  };

  // Like/Unlike
  const handleLike = async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      alert("Please log in to like posts");
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLiked(data.isLiked);
        setLikeCount((prev) => prev + (data.isLiked ? 1 : -1));
      }
    } catch (err) {
      console.error("Failed to like post:", err);
    }
  };

  // Delete post (owner)
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
      if (resp.ok) {
        alert("Post deleted");
        router.push("/");
      } else {
        const data = await resp.json();
        alert(data.message || "Failed to delete post");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete post. Please try again.");
    }
  };

  // Image select (edit mode)
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return setSelectedImage(null);
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }
    setSelectedImage(file);
  };

  // Clear selected image
  const removeImage = () => {
    setSelectedImage(null);
    const fileInput = document.getElementById("imageUpload");
    if (fileInput) fileInput.value = "";
  };

  // Edit toggles
  const startEdit = () => {
    setForm({ title: post.title || "", content: post.content || "" });
    setErrors({});
    setIsEditing(true);
  };
  const cancelEdit = () => {
    setIsEditing(false);
    setErrors({});
    setSelectedImage(null);
  };

  // Edit field change
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((s) => ({ ...s, [name]: "" }));
  };

  // Save edit
  const saveEdit = async () => {
    const newErrors = {};
    if (!form.title || !form.title.trim()) newErrors.title = "Title is required";
    if (!form.content || !form.content.trim()) newErrors.content = "Content is required";
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    try {
      let resp;
      if (selectedImage) {
        const formData = new FormData();
        formData.append("title", form.title);
        formData.append("content", form.content);
        formData.append("photo", selectedImage);

        resp = await fetch(`/api/posts/${postId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
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
      if (resp.ok) {
        post.title = data.title;
        post.content = data.content;
        if (data.photoUrl) post.photo = data.photoUrl;
        setIsEditing(false);
        setSelectedImage(null);
        alert("Post updated");
        window.location.reload(); // quick refresh to reflect new image
      } else {
        alert(data.message || "Failed to update post");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update post. Please try again.");
    }
  };

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
      <div className={styles.container}>
        <Link className={styles.backLink} href="/">← Back</Link>

        <h1 className={styles.title}>{post.title}</h1>

       {/* ---- Repost badge block (NEW) ---- */}
       {post?.repostOf && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={badgeStyle}>Repost</span>
            {post?.original?.id ? (
              <span style={{ fontSize: 13, color: "#374151" }}>
                Reposted from{" "}
                <Link href={`/posts/${post.original.id}`} style={{ textDecoration: "underline" }}>
                  {post.original.title || "original post"}
                </Link>
              </span>
            ) : (
              <span style={{ fontSize: 13, color: "#6b7280" }}>Reposted from original post</span>
            )}
          </div>
        )}
        
        {/* Meta badges */}
        <div className={styles.metaBadges}>
          {post?.difficulty && <span className={styles.badge}>Difficulty: {post.difficulty}</span>}
          {Number.isFinite(post?.timeMax) && <span className={styles.badge}>Max: {post.timeMax} min</span>}
          {post?.dietary && <span className={styles.badge}>Dietary: {post.dietary}</span>}
        </div>

        {/* Date + actions */}
        {post.createdAt && (
          <div className={styles.headerRow}>
            <p className={styles.createdAt}>
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
            <div className={styles.actionsRight}>
              <button
                onClick={handleLike}
                className={`${styles.btn} ${liked ? styles.btnLikeOn : styles.btnLikeOff}`}
                aria-pressed={liked}
                aria-label="Like"
              >
                <span className={styles.heart}>❤️</span> {likeCount}
              </button>

              <button
                onClick={handleSaveButton}
                className={`${styles.btn} ${isFavorited ? styles.btnSavedOn : styles.btnSavedOff}`}
                aria-pressed={isFavorited}
                aria-label="Save"
              >
                {isFavorited ? "Saved" : "Save"}
              </button>
              
            </div>
          </div>
        )}

        {/* Content */}
        <article className={styles.content}>{post.content}</article>

        {/* Image */}
        {post.photo && <img className={styles.image} src={post.photo} alt="" />}

        {/* Actions (owner vs non-owner) */}
        <div className={styles.actionsBlock}>
          {isOwner ? (
            <>
              {!isEditing ? (
                <div className={styles.actionsRow}>
                  <button onClick={startEdit} className={`${styles.btn} ${styles.btnPrimary}`}>
                    Edit Post
                  </button>
                  <button onClick={handleDelete} className={`${styles.btn} ${styles.btnDanger}`}>
                    Delete Post
                  </button>
                </div>
              ) : (
                <div className={styles.editWrap}>
                  <div className={styles.editForm}>
                    <input
                      name="title"
                      value={form.title}
                      onChange={onChange}
                      placeholder="Title"
                      className={styles.input}
                    />
                    {errors.title && <div className={styles.error}>{errors.title}</div>}

                    <textarea
                      name="content"
                      value={form.content}
                      onChange={onChange}
                      rows={8}
                      placeholder="Content"
                      className={styles.textarea}
                    />
                    {errors.content && <div className={styles.error}>{errors.content}</div>}

                    {/* Image upload for edit */}
                    <Row className={styles.imageUploadSection}>
                      <Col md={3}>
                        <label htmlFor="imageUpload" className={styles.label}>
                          Add Photo (Optional):
                        </label>
                      </Col>
                      <Col md={9}>
                        <input
                          type="file"
                          id="imageUpload"
                          accept="image/*"
                          onChange={handleImageChange}
                          className={styles.file}
                        />
                        {selectedImage && (
                          <div className={styles.selectedFile}>
                            <span className={styles.selectedName}>✓ {selectedImage.name}</span>
                            <button
                              type="button"
                              onClick={removeImage}
                              className={`${styles.btn} ${styles.btnRemove}`}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </Col>
                    </Row>

                    <div className={styles.actionsRow}>
                      <button onClick={saveEdit} className={`${styles.btn} ${styles.btnSuccess}`}>
                        Save
                      </button>
                      <button onClick={cancelEdit} className={`${styles.btn} ${styles.btnGrey}`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={toggleRepost}
              className={`${styles.btn} ${isReposted ? styles.btnRepostOn : styles.btnRepostOff}`}
              disabled={repostWorking}
              aria-label="Repost"
              aria-pressed={isReposted}
            >
              {isReposted ? "Reposted" : "Repost"} • {repostCount}
            </button>
          )}
        </div>

        {/* Comments */}
        <hr className={styles.hr} />
        <section className={styles.comments}>
          <h2 className={styles.commentsTitle}>Comments</h2>
          {postId && <CommentSection postId={postId} />}
        </section>
      </div>
    </>
  );
}

// SSR: hydrate post details on first load
export async function getServerSideProps({ params, req }) {
  const base = `http://${req?.headers?.host || "localhost:3000"}`;
  try {
    const r = await fetch(`${base}/api/posts/${params.postId}`);
    if (!r.ok) return { props: { notFound: true } };
    const post = await r.json();

    // If this post is a repost, try to fetch minimal info about the original post
    if (post?.repostOf) {
      try {
        const r2 = await fetch(`${base}/api/posts/${post.repostOf}`);
        if (r2.ok) {
          const original = await r2.json();
          // Attach minimal info to render a link/badge
          post.original = {
            id: original?.id || original?._id,
            title: original?.title || "Original post",
            authorId: original?.authorId || null,
          };
        }
      } catch {
        // ignore fetch error; badge will still show without link
      }
    }

    return { props: { post, postIdFromProps: params.postId } };
  } catch {
    return { props: { notFound: true } };
  }
}