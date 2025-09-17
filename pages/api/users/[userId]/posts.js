// Test

const POSTS = [
    { id: "p_1", title: "Best Kimchi", content: "Salt, napa...", authorId: "u_123", authorName: "Jungkyu" },
    { id: "p_2", title: "Spicy Ramen", content: "Broth steps...", authorId: "u_123", authorName: "Jungkyu" },
  ];
  
  export default function handler(req, res) {
    const { userId } = req.query;
    const items = POSTS.filter(p => p.authorId === userId)
      .map(p => ({ ...p, excerpt: p.content.slice(0, 60) }));
    res.status(200).json({ items });
  }
  