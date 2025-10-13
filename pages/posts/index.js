import { useEffect } from "react";
import { useRouter } from "next/router";

// This file accidentally contained server/API code and imported server-only modules
// (mongodb). That caused the bundler to attempt to include node core modules like
// `net` into the client bundle. The real API lives at `/pages/api/posts/index.js`.
// Keep this page as a lightweight client redirect to the posts list (index.jsx).

export default function PostsIndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/posts');
  }, [router]);
  return null;
}
