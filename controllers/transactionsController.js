import Transaction from "../models/Transaction.js";

// View user transactions
export const getMyTransactions = async (req, res) => {
    try {
        const txns = await Transaction.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.status(200).json(txns);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch history" });
    }
};
