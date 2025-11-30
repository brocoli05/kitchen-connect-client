import TopNavBar from "@/components/TopNavBar";
import React, { useEffect, useState } from "react";
import { Row, Col } from "react-bootstrap";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Explore() {
  const router = useRouter();
  const [recipes, setRecipes] = useState([]);
  const [suggestedPosts, setSuggestedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;
  const maxPageButtons = 5;
  const [totalPages, setTotalPages] = useState(1);

  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let query = `/api/posts?page=${page}&limit=${itemsPerPage}`;
        if (sortField && sortOrder) {
          query += `&sortField=${sortField}&sortOrder=${sortOrder}`;
        }

        // Explore recipes
        const res = await fetch(query);
        if (res.ok) {
          const data = await res.json();
          setRecipes(data.items || []);
          setTotalPages(data.totalPages || 1);
        }

        // Suggested posts
        const suggestedRes = await fetch(`/api/posts?sort=liked&limit=5`);
        if (suggestedRes.ok) {
          const suggestedData = await suggestedRes.json();
          setSuggestedPosts(suggestedData.items || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, sortField, sortOrder]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageButtons = [];
    let startPage = Math.max(1, page - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    startPage = Math.max(1, endPage - maxPageButtons + 1);

    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <button
          key={i}
          className="paginationButton"
          disabled={i === page}
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(1)}>
          &laquo;
        </button>
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          &lt;
        </button>
        {pageButtons}
        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
        >
          &gt;
        </button>
        <button
          disabled={page === totalPages}
          onClick={() => setPage(totalPages)}
        >
          &raquo;
        </button>
      </div>
    );
  };

  const sortedRecipes = [...recipes].sort((a, b) => {
    if (!sortField) return 0;

    let valA, valB;

    if (sortField === "title") {
      valA = a.title || "";
      valB = b.title || "";
    } else if (sortField === "author") {
      valA = a.author?.name || "";
      valB = b.author?.name || "";
    } else if (sortField === "createdAt") {
      valA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      valB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <>
      <TopNavBar />
      <Row className="mainpage" style={{ marginTop: 20 }}>
        {/* Left Section */}
        <Col md={2} className="mainpage-left">
          <p className="left-right-title">Pages</p>
          <ul className="leftMenu">
            <li onClick={() => router.push("/")}>Home</li>
            <li onClick={() => router.push("/browse")}>Browse</li>
            <li onClick={() => router.push("/explore")}>Explore</li>
            <li onClick={() => router.push("/recipes")}>Recipes</li>
          </ul>
        </Col>

        {/* Center Section */}
        <Col md={7} className="mainpage-center" style={{ padding: 20 }}>
          <h2 className="left-right-title">Explore</h2>
          {loading ? (
            <div style={{ textAlign: "center", padding: 50, color: "gray" }}>
              Loading...
            </div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#000",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    <th
                      style={{
                        padding: 12,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleSort("title")}
                    >
                      Title{" "}
                      {sortField === "title"
                        ? sortOrder === "asc"
                          ? "🔼"
                          : "🔽"
                        : "↕️"}
                    </th>
                    <th
                      style={{ padding: 12, cursor: "pointer" }}
                      onClick={() => toggleSort("author")}
                    >
                      Author{" "}
                      {sortField === "author"
                        ? sortOrder === "asc"
                          ? "🔼"
                          : "🔽"
                        : "↕️"}
                    </th>
                    <th
                      style={{ padding: 12, cursor: "pointer" }}
                      onClick={() => toggleSort("createdAt")}
                    >
                      Created Date{" "}
                      {sortField === "createdAt"
                        ? sortOrder === "asc"
                          ? "🔼"
                          : "🔽"
                        : "↕️"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.length > 0 ? (
                    sortedRecipes.map((item) => (
                      <tr
                        key={item.id || item._id}
                        style={{ borderBottom: "1px solid #e0e0e0" }}
                      >
                        <td style={{ padding: 12 }}>
                          <Link href={`/posts/${item.id || item._id}`}>
                            {item.title}
                          </Link>
                        </td>

                        <td style={{ padding: 12 }}>
                          {item.author && item.author.id ? (
                            <Link
                              href={`/users/${item.author.id}`}
                              style={{
                                fontWeight: 600,
                                color: "#333",
                                textDecoration: "underline",
                              }}
                            >
                              {item.author.name || "Unknown"}
                            </Link>
                          ) : (
                            <span style={{ fontWeight: 600, color: "#999" }}>
                              Unknown
                            </span>
                          )}
                        </td>

                        <td style={{ padding: 12 }}>
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString()
                            : "N/A"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          textAlign: "center",
                          padding: 20,
                          color: "gray",
                        }}
                      >
                        No posts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {renderPagination()}
            </>
          )}
        </Col>

        {/* Right Section */}
        <Col md={3} className="mainpage-right">
          <p className="leftRightTitle">Suggested</p>
        </Col>
      </Row>
    </>
  );
}
