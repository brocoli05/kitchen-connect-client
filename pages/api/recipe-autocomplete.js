// /pages/api/recipe-autocomplete.js
export default async function handler(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Missing query" });

  const resp = await fetch(
    `https://api.spoonacular.com/recipes/autocomplete?number=10&query=${query}&apiKey=${process.env.SPOONACULAR_API_KEY}`
  );
  const data = await resp.json();
  res.status(200).json(data);
}