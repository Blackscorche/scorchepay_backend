import mongoose from "mongoose";

const giftcardProposalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rate: { type: Number, required: true },
    imageUrl: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    verifier: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("GiftcardProposal", giftcardProposalSchema);
