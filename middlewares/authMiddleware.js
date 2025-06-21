import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Make sure your login controller signs with `userId`, not `id`
    req.user = { id: decoded.userId }; // <-- FIXED THIS LINE

    next();
  } catch (err) {
    console.error("JWT error:", err.message);
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};
