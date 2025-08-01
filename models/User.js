import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: String,
  firstname: String,
  lastname: String,
  email: { type: String, unique: true, required: true },
  phone: { type: String, required: true },

  // 🔐 BVN will only be stored temporarily, hidden from default queries
  bvn: { type: String, select: false },

  bvnSubmitted: { type: Boolean, default: false },
  hasVirtualAccount: { type: Boolean, default: false },

  // 🏦 Virtual account details from Flutterwave
  virtualAccountDetails: {
    account_number: { type: String },
    bank_name: { type: String },
    account_name: { type: String },
    order_ref: { type: String }, // useful for tracking
  },

  flutterwaveAccountId: { type: String }, // order_ref or other unique identifier

  password: { type: String, required: true },

  avatar: { type: String, default: null },
  profilePic: { type: String }, // can be merged with avatar if needed
  bio: { type: String, default: '' },

  isVerified: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ["user", "giftcardVerifier", "admin"],
    default: "user"
  },

  wallets: {
    ngn: { type: Number, default: 0 },
    usdt: { type: Number, default: 0 }
  },

  createdAt: { type: Date, default: Date.now }
});

// ✅ This makes it compatible with: import User from '../models/User.js';
const User = mongoose.model("User", userSchema);
export default User;
