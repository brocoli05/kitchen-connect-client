import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import AuthForm from "../components/AuthForm";
import api from "../utils/api";
import { signIn, signOut, useSession } from "next-auth/react";

const LoginPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: session, status } = useSession();

  useEffect(() => {
    // Check for standard JWT token
    const userToken = localStorage.getItem("userToken");
    if (userToken) {
      router.replace("/mainpage");
      return;
    }

    // Check for NextAuth session
    if (status === "authenticated" && session) {
      handleGoogleLogin(session.backendToken);
    }
  }, [router, session, status]);

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

  const handleGoogleLogin = async (googleToken) => {
    setIsLoading(true);
    setError("");

    try {
      const res = await api.post("/google-login", { googleToken });

      if (typeof window !== "undefined") {
        localStorage.setItem("userToken", res.data.token);
      }

      router.push("/mainpage");
    } catch (err) {
      console.error(
        "Google Login Failed:",
        err.response ? err.response.data : err.message
      );
      // Clear NextAuth session if backend login fails
      signOut({ redirect: false });
      setError("Google login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleButtonClick = () => {
    // This redirects the user to the Google login page
    signIn("google");
  };

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return <p>Loading...</p>;
  }

  return (
    <AuthForm
      type="login"
      onSubmit={handleLogin}
      isLoading={isLoading}
      error={error}
      onGoogleLogin={handleGoogleButtonClick}
    />
  );
};

export default LoginPage;
