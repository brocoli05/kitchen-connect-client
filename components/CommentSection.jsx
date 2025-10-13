// components/CommentSection.js
"use client";

import useSWR from "swr";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";
import styles from "../styles/CommentSection.module.css";

const fetcher = (url) =>
  fetch(url).then((res) => res.json().then((data) => data.data));

export default function CommentSection({ postId }) {
  const apiUrl = `/api/posts/${postId}/comments`;
  const {
    data: comments,
    error,
    isLoading,
    mutate,
  } = useSWR(apiUrl, fetcher, { refreshInterval: 5000 });

  const handleMutate = () => {
    mutate(); // call SWR to fetch data
  };

  return (
    <div className="comment-section-container">
      {/* 1. Comment Form */}
      <CommentForm postId={postId} onCommentCreated={handleMutate} />

      <h3 className={styles.commentCountHeader}>
        {comments?.length || 0} Comments
      </h3>

      {/* 2. Comment List */}
      {isLoading ? (
        <p>Loading comments...</p>
      ) : comments?.length === 0 ? (
        <p>Be the first to leave a comment!</p>
      ) : (
        comments?.map((comment) => (
          <CommentItem
            key={comment._id}
            comment={comment}
            onMutate={handleMutate}
          />
        ))
      )}
    </div>
  );
}
