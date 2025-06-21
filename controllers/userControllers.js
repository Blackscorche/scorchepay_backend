import User from "../models/User.js";

// GET /api/users/me
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Fetch user error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
