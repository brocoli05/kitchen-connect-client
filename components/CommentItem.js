// components/CommentItem.js

import React, { useState } from "react";
import { jwtDecode } from "jwt-decode";
import styles from "../styles/CommentSection.module.css";

const getUserIdFromToken = () => {
  const token = localStorage.getItem("userToken");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded.userId;
  } catch (error) {
    console.error("Token Decode Failed:", error.message);
    return null;
  }
};

export default function CommentItem({ comment, onMutate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const currentUserId = getUserIdFromToken();

  // Get author ID from the aggregated data
  const commentAuthorId = comment.authorInfo?._id;

  // Check ownership
  const canEditOrDelete =
    currentUserId && String(currentUserId) === String(commentAuthorId);

  const token = localStorage.getItem("userToken");

  const handleEditStart = () => {
    setIsEditing(true);
    setEditText(comment.text);
  };

  const handleEditSave = async () => {
    if (editText.trim() === "") {
      alert("Comment cannot be empty.");
      return;
    }
    if (editText === comment.text) {
      setIsEditing(false);
      return;
    }

    try {
      const res = await fetch(`/api/comments/${comment._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: editText }),
      });

      if (res.ok) {
        setIsEditing(false);
        onMutate();
      } else {
        const data = await res.json();
        alert(`Update failed: ${data.message || "Server error"}`);
      }
    } catch (error) {
      console.error("Update request error:", error);
      alert("An unexpected error occurred during update.");
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditText(comment.text);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;
    if (!token)
      return alert("Authentication token not found. Please log in again.");

    try {
      const res = await fetch(`/api/comments/${comment._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        onMutate(); // Refresh the comment list
      } else {
        const data = await res.json();
        alert(`Deletion failed: ${data.message || "Server error"}`);
      }
    } catch (error) {
      console.error("Delete request error:", error);
    }
  };

  return (
    <div className={styles.commentItem}>
      <div className={styles.commentContentContainer}>
        {/* Comment Text */}
        <div className={styles.commentTextArea}>
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows="3"
              className={styles.editInput}
            />
          ) : (
            <p className={styles.commentText}>{comment.text}</p>
          )}
        </div>
        {/* Edit/Delete Text */}
        {canEditOrDelete && (
          <div className={styles.commentActions}>
            {" "}
            {isEditing ? (
              <>
                <button onClick={handleEditSave} className={styles.btnPrimary}>
                  Save
                </button>
                <button onClick={handleEditCancel} className="feed-action-btn">
                  Cancel
                </button>{" "}
              </>
            ) : (
              <>
                <button onClick={handleEditStart} className="feed-action-btn">
                  Edit
                </button>
                <button onClick={handleDelete} className="feed-action-btn">
                  Delete
                </button>{" "}
              </>
            )}{" "}
          </div>
        )}
      </div>

      {/* Author Info */}
      <small className="light-text-color" style={{ fontSize: "0.8rem" }}>
        Author: {comment.authorInfo?.username || "Deleted User"} |{" "}
        {new Date(comment.createdAt).toLocaleDateString()}
      </small>
    </div>
  );
}
