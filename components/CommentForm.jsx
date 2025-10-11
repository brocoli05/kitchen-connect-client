// components/CommentForm.js
"use client";

import { useState } from "react";
import styles from "../styles/CommentSection.module.css";

export default function CommentForm({ postId, onCommentCreated }) {
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
          postId: postId,
          text: text,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setText(""); // Clear the input field
        // Call the parent handler to update the comments list
        onCommentCreated(responseData.newComment || {});
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
    <form onSubmit={handleSubmit} className={styles.commentForm}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your comment here..."
        rows="4"
        disabled={isSubmitting}
        className={styles.commentInput}
      />

      {submitError && <p className={styles.errorMessage}>{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting || !text.trim()}
        className={styles.submitButton}
      >
        {isSubmitting ? "Posting..." : "Add Comment"}
      </button>
    </form>
  );
}
