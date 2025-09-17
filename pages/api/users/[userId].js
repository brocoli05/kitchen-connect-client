// Testconst 
const USERS = {
  u_123: { id: "u_123", name: "Jungkyu", bio: "Recipe lover" },
  u_999: { id: "u_999", name: "Other User", bio: "Just cooking" },
};

export default function handler(req, res) {
  const { userId } = req.query;
  const user = USERS[userId];
  if (!user) return res.status(404).json({ message: "Not found" });
  res.status(200).json(user);
}
