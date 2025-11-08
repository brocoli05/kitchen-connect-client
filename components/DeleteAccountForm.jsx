import React, { useState } from "react";
import { useRouter } from "next/router";
import { signOut } from "next-auth/react";
import api from "../utils/api";

const DeleteAccountForm = () => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    const token = localStorage.getItem("userToken");

    if (!token) {
      alert("Session expired. Please log in again.");
      router.push("/login");
      return;
    }

    const isConfirmed = window.confirm(
      "WARNING: Are you sure you want to permanently delete your account and all associated data? This action cannot be undone."
    );

    if (!isConfirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await api.delete("/profile");

      alert("Your account has been successfully deleted.");

      // Clean up local storage
      localStorage.removeItem("userToken");

      // Clear NextAuth session (for Google/Social users)
      await signOut({ redirect: false });

      // Redirect
      router.push("/login");
    } catch (error) {
      console.error(
        "Account deletion failed:",
        error.response?.data || error.message
      );
      const errorMessage =
        error.response?.data?.message ||
        "Failed to delete account. Please try again later.";
      alert(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#fdd",
        border: "1px solid red",
        borderRadius: "5px",
      }}
    >
      <h4>Permanently Delete Your Account</h4>
      <p>
        Once you confirm, all your recipes, comments, and profile data will be
        erased immediately and permanently.
      </p>
      <button
        onClick={handleDeleteAccount}
        disabled={isDeleting}
        style={{
          backgroundColor: "red",
          color: "white",
          padding: "10px 20px",
          border: "none",
          cursor: isDeleting ? "not-allowed" : "pointer",
          fontWeight: "bold",
          opacity: isDeleting ? 0.7 : 1,
        }}
      >
        {isDeleting ? "Deleting..." : "Confirm and Permanently Delete"}
      </button>
    </div>
  );
};

export default DeleteAccountForm;
