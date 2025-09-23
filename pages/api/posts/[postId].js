// Test

const POSTS = {
    p_1: { id: "p_1", title: "Best Kimchi", content: "Salt, napa...\n1) ...\n2) ...", authorId: "u_123", authorName: "Jungkyu" },
    p_2: { id: "p_2", title: "Spicy Ramen", content: "Broth steps...\n1) ...\n2) ...", authorId: "u_123", authorName: "Jungkyu" },
  };
  
  export default function handler(req, res) {
    const { postId } = req.query;
    const post = POSTS[postId];
    if (!post) return res.status(404).json({ message: "Not found" });
    res.status(200).json(post);
  }
  