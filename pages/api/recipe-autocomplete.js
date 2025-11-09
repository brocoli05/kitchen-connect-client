// /pages/api/recipe-autocomplete.js
export default async function handler(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
    const resp = await fetch(
      `https://api.spoonacular.com/recipes/autocomplete?number=10&query=${query}&apiKey=${process.env.SPOONACULAR_API_KEY}`
    );
    if (!resp.ok) {
      return res.status(resp.status).json({ error: `Spoonacular API error: ${resp.statusText}` });
    }
    const data = await resp.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch or parse Spoonacular API response", details: err.message });
  }
}