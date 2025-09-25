import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AuthForm from "../components/AuthForm";
import api from "../utils/api";

const LoginPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const userToken = localStorage.getItem("userToken");
    if (userToken) {
      router.replace("/mainpage");
    }
  }, [router]);

  const handleLogin = async (formData) => {
    const { email, password } = formData;

    setIsLoading(true);
    setError("");

    try {
      const res = await api.post("/login", { email, password });

      if (typeof window !== "undefined") {
        localStorage.setItem("userToken", res.data.token);
      }

      router.push("/mainpage");
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
