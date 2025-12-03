// pages/posts/[postId].jsx
import Link from "next/link";
import TooltipButton from "@/components/TooltipButton";
import CommentSection from "@/components/CommentSection";
import ChatWidget from "@/components/ChatWidget";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import api from "../../utils/api";
import TopNavBar from "@/components/TopNavBar";
import { Row, Col } from "react-bootstrap";
import st from "@/styles/createPost.module.css";
import ReportPostModal from "@/components/ReportPostModal";

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

const DIFFICULTY_OPTIONS = ["", "Easy", "Medium", "Hard"];

const formatTimeValue = (value) => {
  if (value === 0) return "0";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? "" : trimmed;
  }
  return "";
};

const formatListForInput = (value, fallback = "") => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  if (Array.isArray(fallback)) return fallback.join(", ");
  if (typeof fallback === "string") return fallback;
  return "";
};

const resolveList = (value, fallback) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (Array.isArray(fallback)) return fallback.filter(Boolean);
  const source = value ?? fallback;
  return typeof source === "string"
    ? source
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
};

const splitInputList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const createFormState = (source = {}) => ({
  title: source?.title || "",
  content: source?.content || "",
  time: formatTimeValue(source?.timeMax),
  difficulty: source?.difficulty || "",
  dietary: typeof source?.dietary === "string" ? source.dietary : "",
  include: formatListForInput(source?.includeIngredients, source?.include),
  exclude: formatListForInput(source?.excludeIngredients, source?.exclude),
});

export default function PostPage({ post: initialPost, notFound, postIdFromProps }) {
  const router = useRouter();
  const [postData, setPostData] = useState(initialPost);
  const [form, setForm] = useState(() => createFormState(initialPost));
  const [isSaving, setIsSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(
    typeof initialPost?.likeCount === "number" ? initialPost.likeCount : 0
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(
    typeof initialPost?.repostCount === "number" ? initialPost.repostCount : 0
  );
  const post = postData;
  const postId = post?.id;
  const metaCardStyle = {
    flex: "1 1 180px",
    border: "1px solid #eee",
    borderRadius: 8,
    padding: "12px 16px",
    minWidth: 180,
    background: "#fdfdfd",
  };
  const metaLabelStyle = { fontSize: 12, color: "#6b7280", marginBottom: 4 };
  const metaValueStyle = { fontWeight: 600, fontSize: 16 };
  const cookingTimeLabel =
    post?.timeMax === 0 || (typeof post?.timeMax === "number" && Number.isFinite(post?.timeMax))
      ? `${post.timeMax} min`
      : post?.timeMax
      ? `${post.timeMax} min`
      : "Not specified";
  const difficultyLabel = post?.difficulty || "Not specified";
  const dietaryLabel = post?.dietary || "Not specified";
  const [errors, setErrors] = useState({});
  const [isFavorited, setIsFavorited] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const likingRef = useRef(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockedPost, setBlockedPost] = useState(false);
  const currentUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://kitchen-connect-client.vercel.app/posts/${postIdFromProps}`;
  const shareUrls = getSocialShareUrls(post?.title || "", currentUrl);
  const includeList = resolveList(post?.includeIngredients, post?.include);
  const excludeList = resolveList(post?.excludeIngredients, post?.exclude);
  const includeDisplay = includeList.length ? includeList.join(", ") : "None";
  const excludeDisplay = excludeList.length ? excludeList.join(", ") : "None";

  if (notFound || !post) {
    return (
      <>
        <TopNavBar />
        <div style={{ textAlign: "center", padding: "50px" }}>
          <h1>Post not found</h1>
          <p>The post you're looking for doesn't exist.</p>
          <Link href="/">Go back home</Link>
        </div>
      </>
    );
  }

  // Repost
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;

    (async () => {
      try {
        const res = await api.get(`/posts/${postIdFromProps}/repost`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsReposted(!!res.data.isReposted);
        setRepostCount(
          typeof res.data.repostCount === "number" ? res.data.repostCount : 0
        );
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
        const res = await api.get(`/posts/${postIdFromProps}/isLike`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsLiked(!!res.data.isLiked);
        setLikeCount(
          typeof res.data.likeCount === "number" ? res.data.likeCount : 0
        );
      } catch (e) {
        console.warn("fetchLikeStatus failed", e?.response?.status);
      }
    })();
  }, [postIdFromProps]);

  const handleLike = async () => {
    // Debouncing pattern: likingRef is used to prevent multiple rapid like/unlike actions.
    // If likingRef.current is true, a like/unlike request is already in progress.
    // This avoids sending duplicate requests if the user clicks repeatedly.
    if (likingRef.current) return;
    likingRef.current = true;

    const token = localStorage.getItem("userToken");
    if (!token) {
      alert("Please log in to like this post.");
      likingRef.current = false;
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
      if (typeof res.data.likeCount === "number") {
        setLikeCount(res.data.likeCount);
      }
    } catch (e) {
      setIsLiked(prev.isLiked);
      setLikeCount(prev.likeCount);
      alert("Failed to update like. Please try again.");
    } finally {
      likingRef.current = false;
    }
  };
  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) return;

    fetch(`/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const postAuthorId =
          post?.authorId ??
          post?.author?.id ??
          post?.author?._id ??
          post?.authorId;
        if (data && postAuthorId && String(data.id) === String(postAuthorId)) {
          setIsOwner(true);
        } else {
          setIsOwner(false);
        }
      })
      .catch(() => { });
  }, [post]);


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
  const startEdit = () => {
    setForm(createFormState(post));
    setErrors({});
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setForm(createFormState(post));
    setIsEditing(false);
    setErrors({});
    setSelectedImage(null);
    setIsSaving(false);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((s) => ({ ...s, [name]: "" }));
  };

  const saveEdit = async () => {
    const newErrors = {};
    const trimmedTitle = form.title?.trim() || "";
    const trimmedContent = form.content?.trim() || "";
    const parsedTime = form.time === "" ? null : Number(form.time);
    if (!trimmedTitle) newErrors.title = "Title is required";
    if (!trimmedContent) newErrors.content = "Content is required";
    if (form.time !== "" && (!Number.isFinite(parsedTime) || parsedTime < 0)) {
      newErrors.time = "Cooking time must be zero or a positive number";
    }
    if (form.difficulty && !DIFFICULTY_OPTIONS.includes(form.difficulty)) {
      newErrors.difficulty = "Difficulty must be Easy, Medium, or Hard";
    }
    const dietaryTags = splitInputList(form.dietary);
    const invalidDietary = dietaryTags.filter(
      (tag) => !/^[a-zA-Z\s-]+$/.test(tag)
    );
    if (invalidDietary.length) {
      newErrors.dietary = `Unsupported dietary tags: ${invalidDietary.join(", ")}`;
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);

    const includeCsv = splitInputList(form.include).join(", ");
    const excludeCsv = splitInputList(form.exclude).join(", ");
    const payload = {
      title: trimmedTitle,
      content: trimmedContent,
      timeMax: parsedTime ?? "",
      difficulty: form.difficulty,
      dietary: dietaryTags.join(", "),
      include: includeCsv,
      exclude: excludeCsv,
    };

    const token =
      typeof window !== "undefined" ? localStorage.getItem("userToken") : null;

    try {
      let resp;

      if (selectedImage) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value === null ? "" : String(value));
          }
        });
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
          body: JSON.stringify(payload),
        });
      }

      const data = await resp.json();
      if (resp.ok) {
        const updatedPost = {
          ...post,
          title: data.title,
          content: data.content,
          photo: data.photo || data.photoUrl || post.photo,
          timeMax: data.timeMax ?? null,
          difficulty: data.difficulty ?? "",
          dietary: data.dietary ?? "",
          includeIngredients: Array.isArray(data.includeIngredients)
            ? data.includeIngredients
            : splitInputList(includeCsv),
          excludeIngredients: Array.isArray(data.excludeIngredients)
            ? data.excludeIngredients
            : splitInputList(excludeCsv),
        };

        setPostData(updatedPost);
        setForm(createFormState(updatedPost));
        setIsEditing(false);
        setSelectedImage(null);
        alert("Post updated");
      } else {
        alert(data.message || "Failed to update post");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update post. Please try again.");
    } finally {
      setIsSaving(false);
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
              })}{" "}
              by{" "}
              {post.author ? (
                <Link
                  href={`/users/${post.author.id}`}
                  style={{
                    fontWeight: 600,
                    color: "#333",
                    textDecoration: "underline",
                  }}
                >
                  {post.author.name || "Unknown"}
                </Link>
              ) : (
                <span style={{ fontWeight: 600, color: "#333" }}>Unknown</span>
              )}
            </p>
            {/* Report button */}
            <TooltipButton tooltip="Report" placement="bottom">
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                style={{
                  padding: "8px 16px",
                  fontSize: 16,
                  border: "none",
                  borderRadius: 4,
                  backgroundColor: "#fff",
                  color: "#dc2626",
                  cursor: "pointer",
                }}
              >
                🚩
              </button>
            </TooltipButton>

            {/* Block post (toggle) */}
            <TooltipButton tooltip={blockedPost ? "Unblock" : "Block"} placement="bottom">
              <button
                type="button"
                disabled={blocking}
                onClick={async () => {
                const token =
                  typeof window !== "undefined"
                    ? localStorage.getItem("userToken")
                    : null;
                if (!token) {
                  alert("Please log in to block posts.");
                  return;
                }
                setBlocking(true);
                try {
                  const res = await fetch(`/api/posts/${postIdFromProps}/block`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ scope: "post" }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    alert(data.message || "Failed to update block.");
                  } else {
                    setBlockedPost(data.blocked);
                    alert(
                      data.blocked
                        ? "This post is now blocked and will be hidden from your feed."
                        : "This post is unblocked."
                    );
                  }
                } catch (e) {
                  console.error("block post failed", e);
                  alert("Failed to block post.");
                } finally {
                  setBlocking(false);
                }
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: 16,
                  border: "none",
                  borderRadius: 4,
                  backgroundColor: blockedPost ? "#6b7280" : "#fff",
                  color: blockedPost ? "#fff" : "#374151",
                  cursor: blocking ? "default" : "pointer",
                }}
              >
                📛
              </button>
            </TooltipButton>
            <TooltipButton tooltip={isLiked ? "Unlike" : "Like"} placement="bottom">
              <button
                type="button"
                onClick={handleLike}
                style={{
                  padding: "8px 16px",
                  fontSize: 16,
                  border: "none",
                  borderRadius: 4,
                  backgroundColor: isLiked ? "#e11d48" : "#fff",
                  color: isLiked ? "#fff" : "#333",
                  cursor: "pointer",
                  fontWeight: isLiked ? "bold" : "normal",
                }}
              >
                {isLiked ? "🤍" : "❤️"}
                {typeof likeCount === "number" ? ` (${likeCount})` : ""}
              </button>
            </TooltipButton>
            <TooltipButton tooltip={isReposted ? "Unrepost" : "Repost"} placement="bottom">
              <button
                type="button"
                onClick={handleRepost}
                disabled={isOwner}
                title={isOwner ? "You cannot repost your own post" : ""}
                style={{
                  padding: "8px 16px",
                  fontSize: 16,
                  border: "none",
                  borderRadius: 4,
                  backgroundColor: isReposted ? "#0ea5e9" : "#fff",
                  color: isOwner ? "#aaa" : isReposted ? "#fff" : "#333",
                  cursor: isOwner ? "not-allowed" : "pointer",
                  fontWeight: isReposted ? "bold" : "normal",
                  marginLeft: 8,
                  opacity: isOwner ? 0.6 : 1,
                }}
              >
                🔁
                {typeof repostCount === "number" ? ` (${repostCount})` : ""}
              </button>
            </TooltipButton>
            <div style={{ display: "flex", gap: 8, position: "relative" }}>
              {/* Save Button */}
              <TooltipButton tooltip={isFavorited ? "Unsave" : "Save Recipe"} placement="bottom">
                <button
                  onClick={handleSaveButton}
                  style={{
                    padding: "8px 16px",
                    fontSize: 16,
                    border: "none",
                    borderRadius: 4,
                    backgroundColor: isFavorited ? "#333" : "#fff",
                    color: isFavorited ? "#fff" : "#333",
                    cursor: "pointer",
                    fontWeight: isFavorited ? "bold" : "normal",
                  }}
                >
                  🏷️
                </button>
              </TooltipButton>

              {/* Share Button */}
              <TooltipButton tooltip="Share" placement="bottom">
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
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    backgroundColor: "#fff",
                  }}
                >
                  🔗
                </button>
              </TooltipButton>

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

        {/* Constraints & Preferences (read-only) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 8,
            border: "1px solid #eee",
            background: "#f9fafb",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
          }}
          aria-label="Recipe constraints and preferences"
        >
          <div style={{ fontSize: 13, color: "#374151" }}>
            <strong style={{ display: "block", color: "#111827" }}>Cooking Time</strong>
            {typeof post.timeMax === "number" && post.timeMax > 0
              ? `${post.timeMax} min`
              : "—"}
          </div>
          <div style={{ fontSize: 13, color: "#374151" }}>
            <strong style={{ display: "block", color: "#111827" }}>Difficulty</strong>
            {post.difficulty || "—"}
          </div>
          <div style={{ fontSize: 13, color: "#374151" }}>
            <strong style={{ display: "block", color: "#111827" }}>Dietary</strong>
            {post.dietary ? (
              <span
                style={{
                  display: "inline-block",
                  background: "#e0f2fe",
                  color: "#0369a1",
                  border: "1px solid #bae6fd",
                  borderRadius: 9999,
                  padding: "2px 8px",
                }}
              >
                {post.dietary}
              </span>
            ) : (
              "—"
            )}
          </div>
          <div style={{ fontSize: 13, color: "#374151" }}>
            <strong style={{ display: "block", color: "#111827" }}>Include</strong>
            {includeDisplay || "—"}
          </div>
          <div style={{ fontSize: 13, color: "#374151" }}>
            <strong style={{ display: "block", color: "#111827" }}>Exclude</strong>
            {excludeDisplay || "—"}
          </div>
        </div>

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
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                  <Row>
                    <Col style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label>Cooking Time (minutes)</label>
                      <input
                        name="time"
                        type="number"
                        min="0"
                        value={form.time}
                        onChange={onChange}
                        placeholder="e.g., 30"
                        className={st.input}
                      />
                      {errors.time && <div style={{ color: "red" }}>{errors.time}</div>}
                    </Col>
                  </Row>

                  <Row>
                    <Col style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label>Difficulty</label>
                      <select
                        name="difficulty"
                        value={form.difficulty}
                        onChange={onChange}
                        className={st.input}
                      >
                        {DIFFICULTY_OPTIONS.map((opt) => (
                          <option key={opt || "none"} value={opt}>
                            {opt ? opt : "Select difficulty"}
                          </option>
                        ))}
                      </select>
                      {errors.difficulty && (
                        <div style={{ color: "red" }}>{errors.difficulty}</div>
                      )}
                    </Col>
                    <Col style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label>Dietary Tags</label>
                      <input
                        name="dietary"
                        type="text"
                        value={form.dietary}
                        onChange={onChange}
                        placeholder="e.g., vegan, halal"
                        className={st.input}
                      />
                      {errors.dietary && (
                        <div style={{ color: "red" }}>{errors.dietary}</div>
                      )}
                    </Col>
                  </Row>

                  <Row>
                    <Col style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label>Include Ingredients</label>
                      <input
                        name="include"
                        type="text"
                        value={form.include}
                        onChange={onChange}
                        placeholder="e.g., chicken, cheese"
                        className={st.input}
                      />
                    </Col>
                    <Col style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label>Exclude Ingredients</label>
                      <input
                        name="exclude"
                        type="text"
                        value={form.exclude}
                        onChange={onChange}
                        placeholder="e.g., nuts, gluten"
                        className={st.input}
                      />
                    </Col>
                  </Row>

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

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={saveEdit}
                      disabled={isSaving}
                      style={{
                        background: "#10b981",
                        color: "#fff",
                        padding: "8px 12px",
                        border: "none",
                        borderRadius: 6,
                        opacity: isSaving ? 0.7 : 1,
                        cursor: isSaving ? "not-allowed" : "pointer",
                      }}
                    >
                      {isSaving ? "Saving..." : "Save"}
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
        <hr style={{ margin: "40px 0", borderTop: "1px solid #ddd" }} />

        <section className="comments-section">
          <h2 style={{ marginBottom: 20 }}>Comments</h2>
          {postId && <CommentSection postId={postId} />}
        </section>
        {/* Floating chat widget (respects AI disable flag) */}
        <ChatWidget contextId={postId} />
        <ReportPostModal
          postId={postIdFromProps}
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
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
