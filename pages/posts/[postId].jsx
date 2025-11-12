// pages/posts/[postId].jsx
import Link from "next/link";
import CommentSection from "@/components/CommentSection";
import ChatWidget from "@/components/ChatWidget";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import api from "../../utils/api";
import TopNavBar from "@/components/TopNavBar";
import { Row, Col } from "react-bootstrap";
import st from "@/styles/createPost.module.css";
import Head from "next/head";


// Social Media Share URL Helper
const getSocialShareUrls = (title, url) => {
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    instagram: `https://www.instagram.com/`,
  };
};

// Web Share API implementation
const sharePost = async (title, url, onFallbackNeeded) => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: title,
        url: url,
      });
      console.log("Post shared successfully via Web Share API");
    } catch (error) {
      // Check for AbortError (user cancelled)
      if (error.name !== "AbortError") {
        console.error("Error sharing:", error);
      }
    }
  } else {
    // If Web Share API is not supported, trigger fallback UI
    onFallbackNeeded();
  }
};

const GEOLOCATION_TIMEOUT = 8000;

export default function PostPage({ post, notFound, postIdFromProps }) {
  const postId = post?.id;
  const router = useRouter();

  const likingRef = useRef(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(typeof post.likeCount === "number" ? post.likeCount : 0);
  const [isEditing, setIsEditing] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(typeof post.repostCount === "number" ? post.repostCount : 0);
  const [form, setForm] = useState({
    title: post.title || "",
    content: post.content || "",
  });
  const [errors, setErrors] = useState({});
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const currentUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://kitchen-connect-client.vercel.app/posts/${postIdFromProps}`;
  const shareUrls = getSocialShareUrls(post.title, currentUrl);


  // Repost
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;

    (async () => {
      try {
        const res = await api.get(
          `/posts/${postIdFromProps}/repost`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsReposted(!!res.data.isReposted);
        setRepostCount(typeof res.data.repostCount === "number" ? res.data.repostCount : 0);
      } catch (e) {
        console.warn("fetchRepostStatus failed", e?.response?.status);
      }
    })();
  }, [postIdFromProps]); 

  const handleRepost = async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      alert("Please log in to repost this.");
      return;
    }

    const prev = { isReposted, repostCount };
    // Optimistic UI
    setIsReposted(!isReposted);
    setRepostCount((c) => c + (isReposted ? -1 : 1));

    try {
      const res = await api.post(`posts/${postIdFromProps}/repost`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsReposted(!!res.data.isReposted);
      if (typeof res.data.repostCount === "number") {
        setRepostCount(res.data.repostCount);
      }
    } catch (e) {
      // rollback
      setIsReposted(prev.isReposted);
      setRepostCount(prev.repostCount);
      alert("Failed to update repost. Please try again.");
    }
  };


  // Like
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
  
    (async () => {
      try {
        const res = await api.get(
          `/posts/${postIdFromProps}/isLike`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsLiked(!!res.data.isLiked);
        setLikeCount(typeof res.data.likeCount === "number" ? res.data.likeCount : 0);
      } catch (e) {
        console.warn("fetchLikeStatus failed", e?.response?.status);
       
      }
    })();
  }, [postIdFromProps]);

  const handleLike = async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      alert("Please log in to like this post.");
      return;
    }
    const prev = { isLiked, likeCount };
    setIsLiked(!isLiked);
    setLikeCount((c) => c + (isLiked ? -1 : 1));
    try {
      const res = await api.post(`posts/${postIdFromProps}/isLike`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsLiked(!!res.data.isLiked);
      if (typeof res.data.likeCount === "number") setLikeCount(res.data.likeCount);
    } catch (e) {
      setIsLiked(prev.isLiked);
      setLikeCount(prev.likeCount);
      alert("Failed to update like. Please try again.");
    }
  };
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

  if (notFound || !post) {
    return (
      <div style={{ padding: 24 }}>
        <p>Post not found.</p>
        <Link href="/">← Back</Link>
      </div>
    );
  }

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;

    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      if (userInfo) {
        setCurrentUser(userInfo);
      }
    } catch (error) {
      console.error("Failed to parse user info:", error);
    }
  }, []);

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
  // Handle image selection - simplified without preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }

      setSelectedImage(file); // Store the actual file object
    }
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null);

    // Clear the file input value so the same file can be selected again
    const fileInput = document.getElementById("imageUpload");
    if (fileInput) {
      fileInput.value = "";
    }
  };

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
  const startEdit = () => {
    setForm({ title: post.title || "", content: post.content || "" });
    setErrors({});
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setErrors({});
    setSelectedImage(null); // Clear selected image when cancelling
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((s) => ({ ...s, [name]: "" }));
  };

  const saveEdit = async () => {
    // Client-side validation
    const newErrors = {};
    if (!form.title || form.title.trim() === "")
      newErrors.title = "Title is required";
    if (!form.content || form.content.trim() === "")
      newErrors.content = "Content is required";
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    try {
      let resp;

      if (selectedImage) {
        // If there's an image, use FormData
        const formData = new FormData();
        formData.append("title", form.title);
        formData.append("content", form.content);
        formData.append("photo", selectedImage);

        resp = await fetch(`/api/posts/${postId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` }, // Don't set Content-Type for FormData
          body: formData,
        });
      } else {
        // No image - use regular JSON approach
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
        // Update UI
        post.title = data.title;
        post.content = data.content;
        if (data.photoUrl) {
          post.photoUrl = data.photoUrl; // Update photo if new one was uploaded
        }
        setIsEditing(false);
        setSelectedImage(null); // Clear selected image
        alert("Post updated");

        // Refresh the page to show updated image
        window.location.reload();
      } else {
        alert(data.message || "Failed to update post");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update post. Please try again.");
    }
  };

  useEffect(() => {
    const checkFavorite = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) {
        return;
      }

      try {
        const res = await api.get(`posts/${postIdFromProps}/isFavorite`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsFavorited(res.data.isFavorited);
      } catch (error) {
        console.error("Failed to get favorite post ", error);
      }
    };
    checkFavorite();
  }, [postIdFromProps]);

  // Record a 'view' activity for this post in the user's history.
  // Prevent duplicate records when navigating back/forward by
  // remembering viewed posts in sessionStorage for the browser session.
  useEffect(() => {
    const recordView = async () => {
      if (typeof window === "undefined") return;

      // Only send once per browser session for this postId
      const sessionKey = `viewed_post_${postIdFromProps}`;
      try {
        if (sessionStorage.getItem(sessionKey)) return;
      } catch (e) {
        // sessionStorage might be unavailable in some environments; swallow
      }

      const token = localStorage.getItem("userToken");
      if (!token) return;

      try {
        await api.post("/users/history", {
          type: "view",
          postId: postIdFromProps,
          title: post.title || null,
        });

        // mark as recorded for this session so back-button won't re-send
        try {
          sessionStorage.setItem(sessionKey, String(Date.now()));
        } catch (e) {
          // ignore storage errors
        }
      } catch (e) {
        // don't block page load if recording fails
        console.error("Failed to record view history", e);
      }
    };

    if (router.isReady) recordView();
  }, [postIdFromProps, post.title, router.isReady]);

  const handleSaveButton = async () => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      return;
    }

    try {
      const res = await api.post(`posts/${postIdFromProps}/favorite`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsFavorited(res.data.isFavorited);
    } catch (error) {
      console.log("Failed to handle save button ", error);
    }
  };

  return (
    <>
      <Head>
        <title>{post.title}</title>
        {/* Ensure your live domain is used here for absolute URLs */}
        <meta property="og:title" content={post.title} />
        <meta
          property="og:description"
          content={post.content.substring(0, 150) + "..."}
        />
        <meta property="og:url" content={currentUrl} />
        {/* Replace YOUR_DEFAULT_IMAGE_URL with your absolute image path */}
        <meta
          property="og:image"
          content={
            post.photo ||
            "https://kitchen-connect-client.vercel.app/images/default-recipe.png"
          }
        />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <TopNavBar />
      <div style={{ maxWidth: 820, margin: "72px auto", padding: "0 16px" }}>
        <Link href="/">← Back</Link>

        <h1 style={{ margin: "16px 0 8px" }}>{post.title}</h1>

        {post.createdAt && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
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
            type="button"                  
            onClick={async () => {
              if (likingRef.current) return;  
              likingRef.current = true;

              const token = localStorage.getItem("userToken");
              if (!token) {
                
                console.warn("Please log in to like this post");
                likingRef.current = false;
                return;
              }

              try {
              
                const res = await api.post(
                  `/posts/${postIdFromProps}/isLike`,
                  null,
                  { headers: { Authorization: `Bearer ${token}` } }
                );

                if (res?.data) {
                  setIsLiked(!!res.data.isLiked);
                  if (typeof res.data.likeCount === "number") setLikeCount(res.data.likeCount);
                }
              } catch (err) {
                console.error("like failed:", err?.response?.status, err?.response?.data || err.message);
                
              } finally {
                likingRef.current = false;
              }
            }}
            style={{
              padding: "8px 16px",
              fontSize: 16,
              border: "1px solid #333",
              borderRadius: 4,
              backgroundColor: isLiked ? "#e11d48" : "#fff",
              color: isLiked ? "#fff" : "#333",
              cursor: "pointer",
              fontWeight: isLiked ? "bold" : "normal",
            }}
          >
            ❤️ {isLiked ? "Liked" : "Like"}{typeof likeCount === "number" ? ` (${likeCount})` : ""}
          </button>
          <button
            type="button"
            onClick={handleRepost}
            disabled={isOwner}                
            title={isOwner ? "You cannot repost your own post" : ""}
            style={{
              padding: "8px 16px",
              fontSize: 16,
              border: "1px solid #333",
              borderRadius: 4,
              backgroundColor: isReposted ? "#0ea5e9" : "#fff",
              color: isOwner ? "#aaa" : (isReposted ? "#fff" : "#333"),
              cursor: isOwner ? "not-allowed" : "pointer",
              fontWeight: isReposted ? "bold" : "normal",
              marginLeft: 8,
              opacity: isOwner ? 0.6 : 1,
            }}
          >
            🔁 {isReposted ? "Reposted" : "Repost"}
            {typeof repostCount === "number" ? ` (${repostCount})` : ""}
          </button>
            <div style={{ display: "flex", gap: 8, position: "relative" }}>
              {/* Save Button */}
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

              {/* Share Button */}
              <button
                onClick={() => {
                  // Try Web Share API first; fallback to popover
                  sharePost(post.title, currentUrl, () =>
                    setShowShareOptions(!showShareOptions)
                  );
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: 16,
                  border: "1px solid #333",
                  borderRadius: 4,
                  cursor: "pointer",
                  backgroundColor: "#fff",
                }}
              >
                🔗 Share
              </button>

              {/* Share Options Popover */}
              {showShareOptions && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    zIndex: 10,
                    border: "1px solid #ddd",
                    backgroundColor: "white",
                    padding: "10px",
                    borderRadius: "4px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                    minWidth: "150px",
                  }}
                >
                  <a
                    href={shareUrls.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareOptions(false)}
                    style={{
                      display: "block",
                      padding: "5px 0",
                      textDecoration: "none",
                      color: "#3b5998",
                    }}
                  >
                    📘 Share on <b>Facebook</b>
                  </a>
                  <a
                    href={shareUrls.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowShareOptions(false)}
                    style={{
                      display: "block",
                      padding: "5px 0",
                      textDecoration: "none",
                      color: "#1da1f2",
                    }}
                  >
                    🐦 Share on <b>X (Twitter)</b>
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentUrl);
                      alert(
                        "🔗 Link copied! You can now paste it into your Instagram story or bio."
                      );
                      window.open(shareUrls.instagram, "_blank");
                      setShowShareOptions(false);
                    }}
                    style={{
                      all: "unset",
                      display: "block",
                      padding: "5px 0",
                      cursor: "pointer",
                      color: "#E4405F",
                    }}
                  >
                    📸 Share on <b>Instagram</b>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentUrl);
                      alert("Link copied to clipboard!");
                      setShowShareOptions(false);
                    }}
                    style={{
                      all: "unset",
                      display: "block",
                      padding: "5px 0",
                      cursor: "pointer",
                      color: "#333",
                    }}
                  >
                    📋 <b>Copy Link</b>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

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
        <br />
        <div>
          {post.photo && (
            <img
              src={post.photo}
              style={{ maxWidth: "100%", borderRadius: 8 }}
            />
          )}
        </div>
        <br />
        {/* Owner actions */}
        {isOwner && (
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            {!isEditing && (
              <>
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
              </>
            )}

            {isEditing && (
              <div style={{ marginTop: 12, width: "100%" }}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <input
                    name="title"
                    value={form.title}
                    onChange={onChange}
                    placeholder="Title"
                    style={{ padding: 8, fontSize: 16 }}
                  />
                  {errors.title && (
                    <div style={{ color: "red" }}>{errors.title}</div>
                  )}
                  <textarea
                    name="content"
                    value={form.content}
                    onChange={onChange}
                    rows={8}
                    placeholder="Content"
                    style={{ padding: 8 }}
                  />
                  {errors.content && (
                    <div style={{ color: "red" }}>{errors.content}</div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Image Upload Section*/}
                    <Row className={st.imageUploadSection}>
                      <Col md={3}>
                        <label htmlFor="imageUpload">
                          Add Photo (Optional):
                        </label>
                      </Col>
                      <Col md={9}>
                        <input
                          type="file"
                          id="imageUpload"
                          accept="image/*"
                          onChange={handleImageChange}
                          style={{ margin: "10px 0", display: "block" }}
                        />
                        {/* Show selected file name and remove button */}
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

        {/* --- COMMENT section --- */}
        <div style={{ margin: "12px 0" }}>
          <button
            onClick={() => openGoogleMaps()}
            style={{
              background: '#2563eb',
              color: '#fff',
              padding: '8px 12px',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Find nearby stores
          </button>
        </div>
        <hr style={{ margin: "40px 0", borderTop: "1px solid #ddd" }} />

        <section className="comments-section">
          <h2 style={{ marginBottom: 20 }}>Comments</h2>
          {postId && <CommentSection postId={postId} />}
        </section>
        {/* Chat widget (floating) */}
        <ChatWidget contextId={postId} />
      </div>
    </>
  );
}

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