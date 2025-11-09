// pages/api/recipes.js
export default async function handler(req, res) {
  const { query = "", number = 10, maxFat } = req.query;
  if (!query) return res.status(400).json({ message: "Missing query" });

  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return res.status(500).json({ message: "SPOONACULAR_API_KEY not set" });

  const params = new URLSearchParams();
  params.set("query", query);
  params.set("number", String(number));
  if (maxFat) params.set("maxFat", String(maxFat));
  params.set("apiKey", apiKey);

  const url = `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ message: "Upstream error", details: txt });
    }
    const data = await r.json();
    // return only the results array to keep response small
    return res.status(200).json({ results: data.results || [], total: data.totalResults || 0 });
  } catch (err) {
    console.error("recipes proxy error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}