import React, { useState } from "react";
import { useRouter } from "next/router";
import AuthForm from "../components/AuthForm";
import api from "../utils/api";

const LoginPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (formData) => {
    const { email, password } = formData;

    // --- TEST CREDENTIALS ---
    if (email === "test@example.com" && password === "test") {
      if (typeof window !== "undefined") {
        localStorage.setItem("token", "dev-token");
      }
    router.push("/mainpage"); // after login
    return;
  }

    setIsLoading(true);
    setError("");
    try {
      const res = await api.post("/login", { email, password });
      if (typeof window !== "undefined") {
        localStorage.setItem("token", res.data.token);
      }
      router.push("/");
    } catch (err) {
      console.error(
        "Login Failed:",
        err.response ? err.response.data : err.message
      );
      setError(
        err.response?.data?.msg ||
          "Login Failed. Please check email or password"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthForm
      type="login"
      onSubmit={handleLogin}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default LoginPage;
