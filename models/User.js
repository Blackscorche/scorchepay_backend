import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  bvn: String,
  password: String,
  role: { type: String, enum: ["user", "giftcardVerifier", "admin"], default: "user" },
  isVerified: { type: Boolean, default: false },
  wallets: {
    ngn: { type: Number, default: 0 },
    usdt: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);
