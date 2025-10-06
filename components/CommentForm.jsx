// components/CommentForm.js
"use client";

import { useState } from "react";

export default function CommentForm({ recipeId, onCommentPosted }) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!text.trim()) {
      setSubmitError("Comment cannot be empty.");
      return;
    }

    const token = localStorage.getItem("userToken");
    if (!token) {
      setSubmitError("You must be logged in to post a comment.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Send the token found under 'userToken' for authentication
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipeId: recipeId,
          text: text,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setText(""); // Clear the input field
        // Call the parent handler to update the comments list
        onCommentPosted(responseData.newComment || {});
      } else {
        setSubmitError(responseData.message || "Failed to post comment.");
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      setSubmitError("A network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your comment here..."
        rows="4"
        disabled={isSubmitting}
        style={{ width: "100%", padding: "10px", boxSizing: "border-box" }}
      />

      {submitError && (
        <p style={{ color: "red", margin: "5px 0" }}>{submitError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !text.trim()}
        className="post-button"
        style={{
          width: "auto",
          padding: "0.5em 1em",
          float: "right",
        }}
      >
        {isSubmitting ? "Posting..." : "Add Comment"}
      </button>
    </form>
  );
}
