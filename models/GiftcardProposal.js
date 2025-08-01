import mongoose from "mongoose";

const giftcardProposalSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rate: { type: Number },
    imageUrl: { type: String },
    code: { type: String, required: true },
    amount: { type: Number },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifier: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("GiftcardProposal", giftcardProposalSchema);
