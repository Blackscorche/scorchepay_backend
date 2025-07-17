import User from "../models/User.js";

// Fetch own profile
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to load profile" });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  const updates = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true });
    res.status(200).json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// Get wallet balances
export const getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.status(200).json({ wallets: user.wallets });
  } catch (err) {
    res.status(500).json({ message: "Could not retrieve wallet" });
  }
};
