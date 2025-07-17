import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

// View own profile
export const getMerchantProfile = async (req, res) => {
    try {
        const merchant = await User.findById(req.user.userId).select("-password");
        if (!merchant || merchant.role !== "merchant")
            return res.status(403).json({ message: "Unauthorized" });

        res.status(200).json(merchant);
    } catch (err) {
        res.status(500).json({ message: "Failed to load profile" });
    }
};

// Get merchant transactions
export const getMerchantTransactions = async (req, res) => {
    try {
        const txns = await Transaction.find({ merchantId: req.user.userId });
        res.status(200).json(txns);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch transactions" });
    }
};

// Submit giftcard or update rate (basic version)
export const submitGiftcardProposal = async (req, res) => {
    const { name, rate } = req.body;

    try {
        // Save this into GiftcardProposal model (create it optionally)
        // Or send to admin via notifications/log
        // Placeholder logic:
        console.log("Giftcard proposal:", { name, rate, submittedBy: req.user.userId });

        res.status(200).json({ message: "Proposal submitted to admin" });
    } catch (err) {
        res.status(500).json({ message: "Failed to submit proposal" });
    }
};
