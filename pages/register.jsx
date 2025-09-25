import React, { useState } from "react";
import { useRouter } from "next/router";
import AuthForm from "../components/AuthForm";
import api from "../utils/api";

const RegisterPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (formData) => {
    const { username, email, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      setError("Password does not match.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const res = await api.post("/register", { username, email, password });
      if (typeof window !== "undefined") {
        localStorage.setItem("token", res.data.token);
      }
      router.push("/");
    } catch (err) {
      console.error(
        "Registration Fail:",
        err.response ? err.response.data : err.message
      );
      setError(err.response?.data?.msg || "Registration Failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthForm
      type="register"
      onSubmit={handleRegister}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default RegisterPage;
