import { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router"; 
import TopNavBar from "@/components/TopNavBar";
import api from "@/utils/api";
import s from "@/styles/recipes.module.css";

/** Utility function to remove empty query parameters */
function sanitize(obj) {
  const clean = { ...obj };
  Object.keys(clean).forEach((k) => {
    if (clean[k] === "" || clean[k] == null) delete clean[k];
  });
  return clean;
}

export default function RecipesPage() {
  const router = useRouter();

  // --- State definitions ---
  const [q, setQ] = useState("");
  const [timeMax, setTimeMax] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [dietary, setDietary] = useState("");
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ items: [], total: 0, totalPages: 1, page: 1 });
  const [loading, setLoading] = useState(false);

  // --- Memoized query parameters ---
  const params = useMemo(
    () =>
      sanitize({
        q,
        timeMax,
        difficulty,
        dietary,
        include,
        exclude,
        sort,
        page,
        limit: 12,
      }),
    [q, timeMax, difficulty, dietary, include, exclude, sort, page]
  );

  // --- Data fetching effect with debounce ---
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get("/posts", { params, signal: controller.signal }); 
        if (!ignore) setData(res.data || { items: [], total: 0, totalPages: 1, page: 1 });
      } catch (e) {
        // axios v1 cancellation
        if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
        console.error("Failed to fetch recipes", e);
        if (!ignore) setData({ items: [], total: 0, totalPages: 1, page: 1 });
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 250);

    return () => {
      ignore = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [params]);

  // --- Reset all filters ---
  const handleClear = () => {
    setQ("");
    setTimeMax("");
    setDifficulty("");
    setDietary("");
    setInclude("");
    setExclude("");
    setSort("relevance");
    setPage(1);
  };

  const items = data?.items || [];

  return (
    <>
      <Head>
        <title>Recipes | Kitchen Connect</title>
      </Head>

      <TopNavBar />

      {/* Back to main page */}
      <div className={s.backRow}>
        <button className={s.backBtn} onClick={() => router.push("/mainpage")}>
          ← Back
        </button>
      </div>

      <div className={s.page}>
        {/* --- Header Section --- */}
        <header className={s.header}>
          <h1 className={s.title}>Recipes</h1>

          {/* --- Filter Toolbar --- */}
          <div className={s.toolbar}>
            {/* Search */}
            <input
              className={s.input}
              type="text"
              placeholder="Search recipes..."
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
            />

            {/* Max Time */}
            <input
              className={s.input}
              type="number"
              min={0}
              placeholder="Max time (min)"
              value={timeMax}
              onChange={(e) => {
                setPage(1);
                setTimeMax(e.target.value);
              }}
            />

            {/* Difficulty */}
            <select
              className={s.select}
              value={difficulty}
              onChange={(e) => {
                setPage(1);
                setDifficulty(e.target.value);
              }}
            >
              <option value="">Any difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            {/* Dietary */}
            <input
              className={s.input}
              type="text"
              placeholder="Dietary (e.g. vegan, halal)"
              value={dietary}
              onChange={(e) => {
                setPage(1);
                setDietary(e.target.value);
              }}
            />

            {/* Include Ingredients */}
            <input
              className={s.input}
              type="text"
              placeholder="Include ingredients (comma)"
              value={include}
              onChange={(e) => {
                setPage(1);
                setInclude(e.target.value);
              }}
            />

            {/* Exclude Ingredients */}
            <input
              className={s.input}
              type="text"
              placeholder="Exclude ingredients (comma)"
              value={exclude}
              onChange={(e) => {
                setPage(1);
                setExclude(e.target.value);
              }}
            />

            {/* Sort */}
            <select
              className={s.select}
              value={sort}
              onChange={(e) => {
                setPage(1);
                setSort(e.target.value);
              }}
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="liked">Most liked</option>
            </select>

            {/* Clear All Button */}
            <button className={s.clearBtn} onClick={handleClear}>
              Clear
            </button>
          </div>
        </header>

        {/* --- Loading / Empty states --- */}
        {loading && <div style={{ padding: "10px" }}>Loading...</div>}
        {!loading && items.length === 0 && (
          <div style={{ padding: "10px", color: "#6b7280" }}>No recipes found.</div>
        )}

        {/* --- Recipe Grid --- */}
        <div className={s.grid}>
          {items.map((r) => (
            <article key={r._id || r.id} className={s.card}>
              <div className={s.cardHeader}>
                <img
                  src={r.photo || "/photo.svg"}
                  alt="Recipe"
                  className={s.thumb}
                />
                <div>
                  <h2 className={s.cardTitle}>{r.title}</h2>
                  <div className={s.meta}>
                    {r.difficulty && <span className={s.badge}>{r.difficulty}</span>}
                    {r.timeMax && <span className={s.badge}>{r.timeMax} min</span>}
                    {r.dietary && <span className={s.badge}>{r.dietary}</span>}
                  </div>
                </div>
              </div>

              <p className={s.desc}>
                {(r.content || "").slice(0, 120)}
                {r.content?.length > 120 ? "…" : ""}
              </p>

              <div className={s.cardActions}>
                <a className={s.link} href={`/posts/${r._id || r.id}`}>
                  View
                </a>
                <a className={s.link} href={`/users/${r.authorId || r.userId || ""}`}>
                  Author
                </a>
              </div>
            </article>
          ))}
        </div>

        {/* --- Pagination --- */}
        <div className={s.pager}>
          <button
            className={s.pagerBtn}
            disabled={(data?.page || 1) <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>

          <span>{data?.page || 1} / {data?.totalPages || 1}</span>

          <button
            className={s.pagerBtn}
            disabled={(data?.page || 1) >= (data?.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
