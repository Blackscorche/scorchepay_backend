import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { v4 as uuidv4 } from "uuid";

// Fund Wallet (initiates Flutterwave)
export const fundWallet = async (req, res) => {
  const { amount } = req.body;
  const { userId } = req.user;

  try {
    // initiateFlutterwaveTransaction should be in utils/flutterwave.js
    const paymentLink = await initiateFlutterwaveTransaction({
      amount,
      userId,
      email: req.user.email,
      currency: "NGN",
    });

    const tx = await Transaction.create({
      userId,
      type: "funding",
      status: "pending",
      amount,
      paymentRef: uuidv4(),
    });

    res.status(200).json({ link: paymentLink });
  } catch (err) {
    res.status(500).json({ message: "Failed to initiate funding", err });
  }
};

// Transfer to another user
export const transferFunds = async (req, res) => {
  const { to, amount } = req.body;
  const fromId = req.user.userId;

  try {
    if (fromId === to) return res.status(400).json({ message: "Invalid recipient" });

    const sender = await User.findById(fromId);
    const recipient = await User.findById(to);
    if (!recipient) return res.status(404).json({ message: "Recipient not found" });

    if (sender.wallets.ngn < amount)
      return res.status(400).json({ message: "Insufficient balance" });

    sender.wallets.ngn -= amount;
    recipient.wallets.ngn += amount;

    await sender.save();
    await recipient.save();

    await Transaction.create([
      {
        userId: fromId,
        type: "transfer",
        status: "completed",
        amount,
        to: to,
      },
      {
        userId: to,
        type: "receive",
        status: "completed",
        amount,
        from: fromId,
      },
    ]);

    res.status(200).json({ message: "Transfer complete" });
  } catch (err) {
    res.status(500).json({ message: "Transfer failed", err });
  }
};
