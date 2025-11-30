// components/ReportPostModal.jsx
import React, { useState } from "react";

export default function ReportPostModal({ postId, open, onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const submit = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      alert("Please select a reason.");
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("userToken")
        : null;
    if (!token) {
      alert("Please log in to report posts.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/posts/${postId}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: trimmedReason,
          details: details.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to report.");
      } else {
        alert(data.message || "Report submitted.");
        onClose();
        setReason("");
        setDetails("");
      }
    } catch (e) {
      console.error("report failed", e);
      alert("Failed to report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15,23,42,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 20px 40px rgba(15,23,42,0.25)",
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 12, fontSize: 18 }}>
          Report post
        </h3>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          Choose a reason. Reports help keep Kitchen Connect safe for everyone.
        </p>

        <div style={{ marginBottom: 12 }}>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: "100%",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              padding: "8px 10px",
              fontSize: 14,
              outline: "none",
            }}
          >
            <option value="">Select a reason</option>
            <option value="spam">Spam or misleading content</option>
            <option value="inappropriate">
              Inappropriate language or images
            </option>
            <option value="harassment">Harassment or hate speech</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder="Optional details for the admins"
            style={{
              width: "100%",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              padding: "8px 10px",
              fontSize: 13,
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            fontSize: 14,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            style={{
              borderRadius: 9999,
              border: "1px solid #d1d5db",
              padding: "6px 14px",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            style={{
              borderRadius: 9999,
              border: "none",
              padding: "6px 16px",
              backgroundColor: "#dc2626",
              color: "#fff",
              fontWeight: 500,
              cursor: sending ? "default" : "pointer",
            }}
          >
            {sending ? "Sending…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}