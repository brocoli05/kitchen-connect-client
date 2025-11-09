// pages/api/recipes/[id].js

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing recipe id' });

  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return res.status(500).json({ message: 'SPOONACULAR_API_KEY not set' });

  try {
    const url = `https://api.spoonacular.com/recipes/${encodeURIComponent(id)}/information?includeNutrition=false&apiKey=${apiKey}`;
    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ message: 'Upstream error', details: txt });
    }
    const data = await r.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('recipe details proxy error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
