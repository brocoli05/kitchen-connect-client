// components/CommentSection.js
"use client";

import { useState, useEffect } from "react";
import CommentForm from "./CommentForm";

export default function CommentSection({ recipeId }) {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/comments?recipeId=${recipeId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch comments.");
      }

      const data = await response.json();
      setComments(data.comments || []);
    } catch (e) {
      console.error("Error fetching comments:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (recipeId) {
      fetchComments();
    }
  }, [recipeId]);

  if (error) {
    return <div className="error-message">Error loading comments: {error}</div>;
  }

  return (
    <div className="comment-section-container">
      {/* 1. Comment Form */}
      <CommentForm recipeId={recipeId} onCommentPosted={fetchComments} />

      <h3 style={{ marginTop: "30px" }}>{comments.length} Comments</h3>

      {/* 2. Comment List */}
      {isLoading ? (
        <p>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p>Be the first to leave a comment!</p>
      ) : (
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {comments.map((comment) => (
            <li
              key={comment._id || comment.commentId}
              style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}
            >
              <p>
                <strong>{comment.authorInfo?.username || "Anonymous"}</strong>
                <small style={{ color: "#888", marginLeft: "10px" }}>
                  {new Date(comment.createdAt).toLocaleDateString()}
                </small>
              </p>
              <p>{comment.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
