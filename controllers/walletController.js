import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import Transaction from '../models/Transactions.js';
import mongoose from 'mongoose';

export const transferFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { recipientUsername, amount } = req.body;
    const transferAmount = parseFloat(amount);

    if (!recipientUsername || isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ message: 'Invalid transfer data' });
    }

    const senderWallet = await Wallet.findOne({ user: req.user.id }).session(session);
    const senderUser = await User.findById(req.user.id).session(session);

    const recipientUser = await User.findOne({ username: recipientUsername }).session(session);
    if (!recipientUser) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }

    if (recipientUser._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    const recipientWallet = await Wallet.findOne({ user: recipientUser._id }).session(session);
    if (!recipientWallet) {
      return res.status(404).json({ message: 'Recipient wallet not found' });
    }

    if (senderWallet.balance < transferAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Perform transfer
    senderWallet.balance -= transferAmount;
    recipientWallet.balance += transferAmount;

    await senderWallet.save({ session });
    await recipientWallet.save({ session });

    await Transaction.create([{
      type: 'transfer',
      from: senderUser._id,
      to: recipientUser._id,
      amount: transferAmount,
      description: `Transfer from ${senderUser.username} to ${recipientUser.username}`,
      status: 'success'
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'Transfer successful' });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Server error during transfer' });
  }
};
export const getWalletBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    res.json({ balance: wallet.balance });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};