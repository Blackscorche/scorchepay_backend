import User from "../models/User.js";

// Get all users
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch users" });
    }
};

// Verify or suspend user
export const updateUserStatus = async (req, res) => {
    const { userId } = req.params;
    const { isVerified } = req.body;

    try {
        const user = await User.findByIdAndUpdate(userId, { isVerified }, { new: true });
        res.status(200).json({ message: "User status updated", user });
    } catch (err) {
        res.status(500).json({ message: "Failed to update user status" });
    }
};

// Delete a user
export const deleteUser = async (req, res) => {
    const { userId } = req.params;

    try {
        await User.findByIdAndDelete(userId);
        res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete user" });
    }
};
