// pages/posts/create.jsx
import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import TopNavBar from "@/components/TopNavBar";

/** Check auth via localStorage token */
const isSignedIn = () =>
  typeof window !== "undefined" && !!localStorage.getItem("userToken");

export default function CreatePostPage() {
  const router = useRouter();

  // Core fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Optional searchable/filterable recipe fields
  const [timeMax, setTimeMax] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [dietary, setDietary] = useState("");
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");

  // Image
  const [photoFile, setPhotoFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  // Redirect unauthenticated users
  if (typeof window !== "undefined" && !isSignedIn()) {
    router.replace("/login");
  }

  /** Validate and set file */
  const onPhotoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setPhotoFile(null);
    if (!f.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB.");
      return;
    }
    setPhotoFile(f);
  };

  /** Create post -> redirect to /posts/[id] */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Title and Content are required.");
      return;
    }
    setSubmitting(true);

    const token = localStorage.getItem("userToken");

    try {
      let resp;
      if (photoFile) {
        // Use multipart/form-data when image exists
        const fd = new FormData();
        fd.append("title", title);
        fd.append("content", content);
        if (timeMax) fd.append("timeMax", String(timeMax));
        if (difficulty) fd.append("difficulty", difficulty);
        if (dietary) fd.append("dietary", dietary);
        if (include) fd.append("include", include);
        if (exclude) fd.append("exclude", exclude);
        fd.append("photo", photoFile);

        resp = await fetch("/api/posts/create", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      } else {
        // Use JSON when no image
        const body = {
          title,
          content,
          timeMax: timeMax ? Number(timeMax) : undefined,
          difficulty: difficulty || undefined,
          dietary: dietary || undefined,
          include: include || undefined,
          exclude: exclude || undefined,
        };

        resp = await fetch("/api/posts/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      }

      const data = await resp.json();
      if (!resp.ok) {
        alert(data?.message || "Failed to create post.");
        setSubmitting(false);
        return;
      }

      // Redirect to detail page using inserted id
      if (data?.id) {
        router.push(`/posts/${data.id}`);
      } else {
        router.push("/recipes");
      }
    } catch (err) {
      console.error("Create post failed:", err);
      alert("Create failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Post | Kitchen Connect</title>
      </Head>
      <TopNavBar />
      <div style={{ maxWidth: 820, margin: "72px auto", padding: "0 16px" }}>
        <h1 style={{ marginBottom: 16 }}>Create Post</h1>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ padding: 10, fontSize: 16 }}
            required
          />

          <textarea
            placeholder="Content"
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ padding: 10 }}
            required
          />

          {/* Optional recipe attributes */}
          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <input
              type="number"
              min={0}
              placeholder="Max time (min)"
              value={timeMax}
              onChange={(e) => setTimeMax(e.target.value)}
              style={{ padding: 10 }}
            />

            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              style={{ padding: 10 }}
            >
              <option value="">Any difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <input
              type="text"
              placeholder="Dietary (e.g., vegan, halal)"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              style={{ padding: 10 }}
            />

            <input
              type="text"
              placeholder="Include ingredients (comma)"
              value={include}
              onChange={(e) => setInclude(e.target.value)}
              style={{ padding: 10 }}
            />

            <input
              type="text"
              placeholder="Exclude ingredients (comma)"
              value={exclude}
              onChange={(e) => setExclude(e.target.value)}
              style={{ padding: 10 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 14, color: "#555" }}>Add Photo (optional)</label>
            <input type="file" accept="image/*" onChange={onPhotoChange} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: "#2563eb",
                color: "#fff",
                padding: "10px 14px",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {submitting ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/recipes")}
              style={{
                background: "#6b7280",
                color: "#fff",
                padding: "10px 14px",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}