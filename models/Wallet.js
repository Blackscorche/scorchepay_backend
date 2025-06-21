// models/Wallet.js
import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'NGN'
  },
  flutterwaveAccountId: String, // if using virtual accounts
}, { timestamps: true });

export default mongoose.model('Wallet', walletSchema);
