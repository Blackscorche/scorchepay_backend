import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'deposit',
      'transfer',
      'airtime',
      'data',
      'cable',
      'electricity',
      'education',
      'giftcard'
    ],
    required: true,
  },

  // User who initiated the transaction
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // For transfers between users
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  amount: {
    type: Number,
    required: true,
  },

  // Transaction fee
  fee: {
    type: Number,
    default: 0
  },

  paymentRef: {
    type: String,
    required: true,
    unique: true,
  },

  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'completed'],
    default: 'pending',
  },

  description: {
    type: String,
  },

  // Additional fields to match your frontend
  title: {
    type: String,
    required: true
  },

  category: {
    type: String,
    enum: ['airtime', 'data', 'cable', 'giftcard', 'transfer', 'deposit'],
    required: true
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    // Can contain:
    // For airtime/data: { phoneNumber, network, dataAmount }
    // For cable: { smartCard, plan, provider }
    // For giftcard: { cardType, cardValue, giftCardImage, merchantId }
    // For transfers: { recipientPhone, recipientName }
  },

  error: {
    type: String, // Reason if transaction failed
  },

  // For merchant approval (giftcards only)
  merchantStatus: {
    type: String,
    enum: ['pending', 'approved', 'declined'],
    default: function () {
      return this.type === 'giftcard' ? 'pending' : undefined;
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
transactionSchema.index({ from: 1, createdAt: -1 });
transactionSchema.index({ to: 1, createdAt: -1 });
transactionSchema.index({ type: 1, merchantStatus: 1 }); // For giftcard filtering

export default mongoose.model('Transaction', transactionSchema);