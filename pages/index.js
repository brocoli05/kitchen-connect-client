import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // Check for a user token or login status in local storage.
    // Replace 'userToken' with the actual key you use.
    const userToken = localStorage.getItem("userToken");

    if (userToken) {
      // If a token exists, the user is considered logged in.
      // Redirect to the main page.
      router.replace("/mainpage");
    } else {
      // If no token exists, the user is not logged in.
      // Redirect to the login page.
      router.replace("/login");
    }
    setLoadingAuth(false);
  }, [router]);

  return (
    <>
      <Head>
        <title>Kitchen Connect</title>
      </Head>
      <div
        className={`${styles.page} ${geistSans.variable} ${geistMono.variable}`}
      >
        <main className={styles.main}>
          {/* Display a loading message while checking the user's login status. */}
          <div className={styles.ctas}>Checking login status...</div>
        </main>
      </div>
    </>
  );
}
