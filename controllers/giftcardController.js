import GiftcardProposal from "../models/GiftcardProposal.js";
import User from "../models/User.js";
import Transaction from "../models/Transactions.js";

// Approve a giftcard and transfer funds
export const approveGiftcard = async (req, res) => {
    try {
        const { proposalId } = req.body;
        const proposal = await GiftcardProposal.findById(proposalId);
        if (!proposal || proposal.status !== "pending") {
            return res.status(404).json({ message: "Giftcard proposal not found or already processed" });
        }
        // Only a giftcardVerifier can approve
        if (req.user.role !== "giftcardVerifier") {
            return res.status(403).json({ message: "Forbidden" });
        }
        // Find verifier and user
        const verifier = await User.findById(req.user.userId);
        const user = await User.findById(proposal.submittedBy);
        if (!verifier || !user) return res.status(404).json({ message: "User not found" });
        // Check verifier balance
        if (verifier.wallets.ngn < proposal.rate) {
            return res.status(400).json({ message: "Insufficient funds in verifier wallet" });
        }
        // Atomic wallet update
        verifier.wallets.ngn -= proposal.rate;
        user.wallets.ngn += proposal.rate;
        await verifier.save();
        await user.save();
        // Update proposal
        proposal.status = "approved";
        proposal.verifier = verifier._id;
        proposal.verifiedAt = new Date();
        await proposal.save();
        // Log transaction
        await Transaction.create({
            type: "giftcard",
            from: verifier._id,
            to: user._id,
            amount: proposal.rate,
            status: "success",
            createdAt: new Date()
        });
        res.json({ message: "Giftcard approved and funds transferred" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
