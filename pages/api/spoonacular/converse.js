// pages/api/spoonacular/converse.js
export default async function handler(req, res) {
  const { text = "", contextId = "" } = req.query;

  if (!text) return res.status(400).json({ message: "Missing text parameter" });

  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return res.status(500).json({ message: "SPOONACULAR_API_KEY not set" });

  try {
    const q = new URLSearchParams();
    q.set("text", String(text));
    if (contextId) q.set("contextId", String(contextId));
    q.set("apiKey", apiKey);

    const url = `https://api.spoonacular.com/food/converse?${q.toString()}`;
    const r = await fetch(url);
    const data = await r.json();
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (err) {
    console.error("spoonacular converse proxy error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
