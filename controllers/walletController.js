import mongoose from 'mongoose';
import User from "../models/User.js";
import Transaction from "../models/Transactions.js";
import {
  createFlutterwaveVirtualAccount, initiateFlutterwaveTransfer, verifyFlutterwaveTransaction, getFlutterwaveBanks,
  resolveFlutterwaveAccount,
  getFlutterwaveTransferFee
} from "../utils/flutterWave.js";
// ✅ FIXED: Create Virtual Account using BVN
export const ensureFlutterwaveAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id); // ✅ FIXED: Use _id consistently

    // 🔧 COMPREHENSIVE DEBUG
    console.log("🔧 Complete Debug Info:", {
      // User data
      userExists: !!user,
      userId: user?._id,
      firstname: user?.firstname,
      lastname: user?.lastname,
      email: user?.email,
      userPhone: user?.phone,

      // Request data
      requestBody: req.body,
      requestPhone: req.body.phone,
      requestBvn: req.body.bvn,

      // What will be sent to Flutterwave
      nameForFlutterwave: user?.firstname && user?.lastname ? `${user.firstname} ${user.lastname}` : "MISSING_NAME"
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const { bvn, phone } = req.body;

    if (!bvn || !phone) {
      return res.status(400).json({ message: "BVN and phone are required" });
    }

    // ✅ Add test BVN validation for development
    const isTestMode = process.env.NODE_ENV !== 'production';
    const testBvn = isTestMode ? "12345678901" : bvn;

    if (user.hasVirtualAccount) {
      return res.status(200).json({
        message: "Virtual account already exists",
        account: user.virtualAccountDetails,
        flutterwaveAccountId: user.flutterwaveAccountId,
        hasVirtualAccount: true,
        ...(isTestMode && { testMode: true })
      });
    }

    const acct = await createFlutterwaveVirtualAccount({
      name: `${user.firstname} ${user.lastname}`,
      email: user.email,
      bvn: testBvn, // ✅ Use test BVN in development
      phone,
    });

    if (!acct?.account_number) {
      return res.status(500).json({ message: "Failed to create virtual account" });
    }

    // Update user with BVN and account info
    user.flutterwaveAccountId = acct.order_ref;
    user.hasVirtualAccount = true;
    user.bvn = testBvn;
    user.bvnSubmitted = true;
    user.virtualAccountDetails = acct;

    await user.save();

    res.status(200).json({
      message: "Virtual account created successfully",
      account: acct,
      flutterwaveAccountId: acct.order_ref,
      hasVirtualAccount: true,
      ...(isTestMode && { testMode: true, testNotice: "Using test BVN for development" })
    });
  } catch (error) {
    console.error("Error creating virtual account:", error?.response?.data || error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
// ✅ Verify ScorchePay user by username
export const verifyUser = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required"
      });
    }

    // Prevent self-lookup
    if (username === req.user.username) {
      return res.status(400).json({
        success: false,
        message: "Cannot send money to yourself"
      });
    }

    const user = await User.findOne({ username }).select('firstname lastname username');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        name: `${user.firstname} ${user.lastname}`,
        fullName: `${user.firstname} ${user.lastname}`,
        username: user.username
      }
    });
  } catch (error) {
    console.error("User verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify user"
    });
  }
};

// ✅ FIXED transferFunds function with correct schema
export const transferFunds = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { to, amount, description = "Internal transfer" } = req.body;
    const fromUserId = req.user._id;

    // Validation
    if (!to || !amount) {
      return res.status(400).json({
        success: false,
        message: "Recipient and amount are required"
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0"
      });
    }

    // Find sender
    const sender = await User.findById(fromUserId).session(session);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender not found"
      });
    }

    // Find recipient by username
    const recipient = await User.findOne({ username: to }).session(session);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found"
      });
    }

    // Check if trying to send to self
    if (sender._id.toString() === recipient._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer to yourself"
      });
    }

    // Check sender balance
    const senderBalance = sender.wallets?.ngn || 0;
    if (senderBalance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance"
      });
    }

    // Generate transaction reference
    const reference = `TXN${Date.now()}${Math.random().toString(36).substr(2, 5)}`;

    // Update balances
    const newSenderBalance = senderBalance - amount;
    const recipientBalance = recipient.wallets?.ngn || 0;
    const newRecipientBalance = recipientBalance + amount;

    // Update sender balance
    await User.findByIdAndUpdate(
      fromUserId,
      { 'wallets.ngn': newSenderBalance },
      { session }
    );

    // Update recipient balance
    await User.findByIdAndUpdate(
      recipient._id,
      { 'wallets.ngn': newRecipientBalance },
      { session }
    );

    // ✅ Create transaction record - ONE transaction with proper schema
    const transactionData = {
      type: 'transfer',
      from: fromUserId,        // ✅ Sender ID
      to: recipient._id,       // ✅ Recipient ID
      amount: amount,
      fee: 0,
      paymentRef: reference,
      title: `Transfer to ${recipient.username}`,
      category: 'transfer',
      status: 'completed',     // ✅ Use 'completed' not 'success'
      description: description,
      metadata: {
        transferType: 'internal',
        recipientUsername: recipient.username,
        recipientName: `${recipient.firstname} ${recipient.lastname}`,
        senderUsername: sender.username,
        senderName: `${sender.firstname} ${sender.lastname}`,
        balanceAfter: {
          sender: newSenderBalance,
          recipient: newRecipientBalance
        }
      }
    };

    // Create the transaction
    await Transaction.create([transactionData], { session });

    await session.commitTransaction();

    console.log('✅ Transfer completed:', {
      reference,
      from: sender.username,
      to: recipient.username,
      amount
    });

    res.status(200).json({
      success: true,
      message: "Transfer successful",
      data: {
        reference,
        amount,
        recipient: {
          username: recipient.username,
          name: `${recipient.firstname} ${recipient.lastname}`
        },
        newBalance: newSenderBalance,
        transactionId: reference
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Transfer error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Transfer failed"
    });
  } finally {
    session.endSession();
  }
};
// In your controllers/walletController.js file
// Replace your existing transferToBank function with this updated version:

export const transferToBank = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const {
      account_number,
      account_bank,
      amount,
      narration = "Bank transfer",
      beneficiary_name
    } = req.body;

    const userId = req.user._id;

    // Validation
    if (!account_number || !account_bank || !amount) {
      return res.status(400).json({
        success: false,
        message: "Account number, bank code, and amount are required"
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0"
      });
    }

    // Find user
    const user = await User.findById(userId).session(session);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get transfer fee
    let transferFee = 50;
    try {
      const feeData = await getFlutterwaveTransferFee({ amount });
      transferFee = feeData.fee || 50;
    } catch (feeError) {
      console.warn("Could not get transfer fee, using default:", feeError.message);
    }

    const totalAmount = amount + transferFee;
    const userBalance = user.wallets?.ngn || 0;

    // Check balance (amount + fee)
    if (userBalance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. You need ₦${totalAmount.toLocaleString()} (₦${amount.toLocaleString()} + ₦${transferFee} fee)`
      });
    }

    // Generate transaction reference
    const reference = `BT${Date.now()}${Math.random().toString(36).substr(2, 5)}`;

    // Resolve account to get beneficiary name if not provided
    let resolvedBeneficiaryName = beneficiary_name;
    if (!resolvedBeneficiaryName) {
      try {
        const accountDetails = await resolveFlutterwaveAccount({
          account_number,
          account_bank
        });
        resolvedBeneficiaryName = accountDetails.account_name;
      } catch (resolveError) {
        console.warn("Could not resolve account name:", resolveError.message);
        resolvedBeneficiaryName = "Account Holder";
      }
    }

    // Initiate Flutterwave transfer
    const transferResult = await initiateFlutterwaveTransfer({
      account_number,
      account_bank,
      amount,
      narration,
      reference,
      beneficiary_name: resolvedBeneficiaryName
    });

    if (!transferResult.status === 'success') {
      return res.status(400).json({
        success: false,
        message: transferResult.message || "Transfer initiation failed"
      });
    }

    // Deduct amount + fee from user wallet
    const newBalance = userBalance - totalAmount;
    await User.findByIdAndUpdate(
      userId,
      { 'wallets.ngn': newBalance },
      { session }
    );

    // ✅ REPLACE THIS SECTION - Updated transaction creation
    await Transaction.create([{
      type: 'transfer',
      from: userId,
      to: null, // External bank - no internal user ID
      amount,
      fee: transferFee,
      paymentRef: reference,
      title: `Bank Transfer to ${resolvedBeneficiaryName}`,
      category: 'transfer',
      status: 'pending', // Will be updated via webhook
      description: `Bank transfer to ${resolvedBeneficiaryName} - ${account_number}`,
      metadata: {
        transferType: 'external',
        account_number,
        account_bank,
        beneficiary_name: resolvedBeneficiaryName,
        flutterwaveRef: transferResult.data?.id,
        flutterwaveData: transferResult.data,
        balanceAfter: newBalance
      }
    }], { session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Bank transfer initiated successfully",
      data: {
        reference,
        amount,
        fee: transferFee,
        total: totalAmount,
        recipient: {
          account_number,
          account_bank,
          beneficiary_name: resolvedBeneficiaryName
        },
        newBalance,
        flutterwaveRef: transferResult.data?.id,
        status: 'pending'
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Bank transfer error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Bank transfer failed"
    });
  } finally {
    session.endSession();
  }
};


// ✅ Get Wallet Balance
export const getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wallets flutterwaveAccountId'); // ✅ Use _id

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Wallet balance retrieved successfully",
      balance: {
        ngn: user.wallets?.ngn || 0,
        usdt: user.wallets?.usdt || 0,
      },
      flutterwaveAccountId: user.flutterwaveAccountId || null,
      hasVirtualAccount: !!user.flutterwaveAccountId
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve wallet balance",
      error: err.message
    });
  }
};

export const getWalletDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select( // ✅ Changed from req.user.id
      'wallets flutterwaveAccountId firstname lastname virtualAccountDetails'
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const recentTransactions = await Transaction.find({ userId: req.user._id }) // ✅ Changed from req.user.id
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('to from', 'firstname lastname username')
      .select('type status amount createdAt to from description reference');

    res.status(200).json({
      success: true,
      message: "Wallet details retrieved successfully",
      data: {
        wallet: {
          balance: {
            ngn: user.wallets?.ngn || 0,
            usdt: user.wallets?.usdt || 0,
          },
          accountInfo: {
            flutterwaveAccountId: user.flutterwaveAccountId,
            accountHolder: `${user.firstname} ${user.lastname}`,
            hasVirtualAccount: !!user.flutterwaveAccountId,
            account_number: user.virtualAccountDetails?.account_number,
            bank_name: user.virtualAccountDetails?.bank_name,
            account_name: `${user.firstname} ${user.lastname}`,
            order_ref: user.virtualAccountDetails?.order_ref || user.virtualAccountDetails?.reference
          },
          recentTransactions
        }
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve wallet details",
      error: err.message
    });
  }
};

// ✅ FIXED: Get user balance - Use consistent user object access
export const getUserBalance = async (req, res) => {
  try {
    // ✅ FIXED: Fetch user from database instead of relying on req.user
    const user = await User.findById(req.user._id).select('wallets flutterwaveAccountId');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const ngnBalance = user.wallets?.ngn || 0;
    const usdtBalance = user.wallets?.usdt || 0;
    const totalBalance = ngnBalance + usdtBalance;

    res.status(200).json({
      success: true,
      data: {
        totalBalance: totalBalance,
        ngnBalance: ngnBalance,
        usdtBalance: usdtBalance,
        mainWallet: {
          currency: 'NGN',
          balance: ngnBalance,
          accountNumber: user.flutterwaveAccountId || null
        },
        wallets: {
          ngn: ngnBalance,
          usdt: usdtBalance
        }
      }
    });
  } catch (err) {
    console.error('Error fetching user balance:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Fix getTotalIncome function
export const getTotalIncome = async (req, res) => {
  try {
    const userId = req.user._id; // ✅ Changed from req.user.id
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: { $in: ["receive", "deposit"] },
          status: "completed",
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        },
      },
    ]);

    const data = result[0] || { total: 0, count: 0 };

    res.status(200).json({
      success: true,
      data: {
        total: data.total,
        count: data.count,
        date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error("Error retrieving income:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Fix getTotalExpenses function
export const getTotalExpenses = async (req, res) => {
  try {
    const userId = req.user._id; // ✅ Changed from req.user.id
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: { $in: ["transfer", "bank_transfer", "fee", "withdrawal"] },
          status: "completed",
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 }
        },
      },
    ]);

    const data = result[0] || { total: 0, count: 0 };

    res.status(200).json({
      success: true,
      data: {
        total: data.total,
        count: data.count,
        date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error("Error retrieving expenses:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// ✅ FIXED: Get user transactions - Proper ObjectId handling
export const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 10,
      type,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter object
    const filter = { userId: new mongoose.Types.ObjectId(userId) }; // ✅ FIXED: Convert to ObjectId

    if (type && type !== 'all') {
      filter.type = type;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Search filter
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get transactions with pagination
    const transactions = await Transaction.find(filter)
      .populate('to from', 'firstname lastname username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('type status amount description createdAt to from reference balanceAfter metadata');

    // Get total count for pagination
    const totalTransactions = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(totalTransactions / parseInt(limit));

    // Transform transactions for frontend
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      status: transaction.status,
      date: transaction.createdAt,
      reference: transaction.reference,
      balanceAfter: transaction.balanceAfter,
      recipient: transaction.to ? {
        name: `${transaction.to.firstname} ${transaction.to.lastname}`,
        username: transaction.to.username
      } : null,
      sender: transaction.from ? {
        name: `${transaction.from.firstname} ${transaction.from.lastname}`,
        username: transaction.from.username
      } : null,
      metadata: transaction.metadata
    }));

    res.status(200).json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalTransactions,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (err) {
    console.error('Error fetching user transactions:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ✅ FIXED: Get user stats - Use consistent user access
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    // ✅ FIXED: Fetch user from database
    const user = await User.findById(userId).select('createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get transaction statistics
    const [
      totalStats,
      statusStats,
      monthlyStats,
      weeklyStats,
      typeStats
    ] = await Promise.all([
      // Total transactions
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // ✅ FIXED: Proper ObjectId conversion
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            avgAmount: { $avg: "$amount" }
          }
        }
      ]),

      // Status breakdown
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]),

      // Monthly transactions
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: "$amount" }
          }
        }
      ]),

      // Weekly transactions
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: "$amount" }
          }
        }
      ]),

      // Transaction type breakdown
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    // Process results
    const total = totalStats[0] || { total: 0, totalAmount: 0, avgAmount: 0 };
    const statusBreakdown = statusStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const monthly = monthlyStats[0] || { count: 0, amount: 0 };
    const weekly = weeklyStats[0] || { count: 0, amount: 0 };
    const favoriteType = typeStats[0]?._id || 'transfer';

    const successRate = total.total > 0 ?
      ((statusBreakdown.completed || 0) / total.total * 100).toFixed(1) : 0;

    const stats = {
      totalTransactions: total.total,
      successfulTransactions: statusBreakdown.completed || 0,
      pendingTransactions: statusBreakdown.pending || 0,
      failedTransactions: statusBreakdown.failed || 0,
      successRate: parseFloat(successRate),
      averageTransactionAmount: Math.round(total.avgAmount || 0),
      monthlyTransactionCount: monthly.count,
      monthlyTransactionAmount: monthly.amount,
      weeklyTransactionCount: weekly.count,
      weeklyTransactionAmount: weekly.amount,
      favoriteTransactionType: favoriteType,
      accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)),
      lastActivityDate: new Date().toISOString(),
      totalTransactionAmount: total.totalAmount,
      typeBreakdown: typeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// ✅ Update wallet balance (Admin/System function)
export const updateWalletBalance = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const { amount, currency = 'ngn', operation = 'add', reason = 'Manual adjustment' } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount provided'
      });
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentBalance = user.wallets[currency] || 0;
    let newBalance;

    if (operation === 'add') {
      newBalance = currentBalance + amount;
    } else if (operation === 'subtract') {
      if (currentBalance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance'
        });
      }
      newBalance = currentBalance - amount;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation. Use "add" or "subtract"'
      });
    }

    // Update the wallet balance
    await User.findByIdAndUpdate(
      userId,
      { [`wallets.${currency}`]: newBalance },
      { new: true, session }
    );

    // Create transaction record
    await Transaction.create([{
      userId,
      type: operation === 'add' ? 'credit' : 'debit',
      status: 'completed',
      amount,
      description: reason,
      reference: `ADJ${Date.now()}`,
      balanceAfter: newBalance
    }], { session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Wallet ${operation}ed successfully`,
      data: {
        previousBalance: currentBalance,
        newBalance: newBalance,
        currency: currency.toUpperCase(),
        amount: amount
      }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error('Error updating wallet balance:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  } finally {
    session.endSession();
  }
};

// Fix verifyBankTransfer function
export const verifyBankTransfer = async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user._id; // ✅ Changed from req.user.id

    // Find transaction
    const transaction = await Transaction.findOne({
      reference,
      userId,
      type: 'bank_transfer'
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Verify with Flutterwave
    const verificationResult = await verifyFlutterwaveTransaction(transaction.flutterwaveRef);

    // Update transaction status based on verification
    if (verificationResult.status === 'successful') {
      transaction.status = 'completed';
    } else if (verificationResult.status === 'failed') {
      transaction.status = 'failed';

      // Refund user if failed
      const user = await User.findById(userId);
      user.wallets.ngn += (transaction.amount + (transaction.metadata?.fee || 0));
      await user.save();
    }

    await transaction.save();

    res.status(200).json({
      success: true,
      data: {
        reference,
        status: transaction.status,
        amount: transaction.amount,
        verificationResult
      }
    });
  } catch (error) {
    console.error('Error verifying bank transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message
    });
  }
};

// ✅ Get list of supported banks
export const getBanks = async (req, res) => {
  try {
    const banks = await getFlutterwaveBanks();

    res.status(200).json({
      success: true,
      message: "Banks retrieved successfully",
      data: banks
    });
  } catch (error) {
    console.error("Error fetching banks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch banks",
      error: error.message
    });
  }
};

// ✅ Resolve account number to get account name
export const resolveAccount = async (req, res) => {
  try {
    const { account_number, account_bank } = req.body;

    if (!account_number || !account_bank) {
      return res.status(400).json({
        success: false,
        message: "Account number and bank code are required"
      });
    }

    const accountDetails = await resolveFlutterwaveAccount({
      account_number,
      account_bank
    });

    res.status(200).json({
      success: true,
      message: "Account resolved successfully",
      data: {
        account_number,
        account_name: accountDetails.account_name,
        bank_code: account_bank
      }
    });
  } catch (error) {
    console.error("Error resolving account:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to resolve account",
    });
  }
};

// ✅ Get transfer fee
export const getTransferFee = async (req, res) => {
  try {
    const { amount, currency = "NGN" } = req.query;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required"
      });
    }

    const feeData = await getFlutterwaveTransferFee({
      amount: parseFloat(amount),
      currency
    });

    res.status(200).json({
      success: true,
      message: "Transfer fee retrieved successfully",
      data: {
        amount: parseFloat(amount),
        fee: feeData.fee || 50,
        total: parseFloat(amount) + (feeData.fee || 50),
        currency
      }
    });
  } catch (error) {
    console.error("Error getting transfer fee:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transfer fee",
      data: {
        amount: parseFloat(req.query.amount || 0),
        fee: 50, // Default fee
        total: parseFloat(req.query.amount || 0) + 50,
        currency: req.query.currency || "NGN"
      }
    });
  }
};

// ✅ Get transaction by reference
export const getTransactionByReference = async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user._id;

    const transaction = await Transaction.findOne({
      reference,
      userId
    }).populate('to from', 'firstname lastname username');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    const formattedTransaction = {
      id: transaction._id,
      reference: transaction.reference,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      description: transaction.description,
      date: transaction.createdAt,
      balanceAfter: transaction.balanceAfter,
      metadata: transaction.metadata,
      recipient: transaction.to ? {
        name: `${transaction.to.firstname} ${transaction.to.lastname}`,
        username: transaction.to.username
      } : null,
      sender: transaction.from ? {
        name: `${transaction.from.firstname} ${transaction.from.lastname}`,
        username: transaction.from.username
      } : null
    };

    res.status(200).json({
      success: true,
      message: "Transaction retrieved successfully",
      data: formattedTransaction
    });
  } catch (error) {
    console.error("Error getting transaction:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve transaction",
      error: error.message
    });
  }
};

// ✅ Get wallet transaction summary
export const getTransactionSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = "month" } = req.query; // day, week, month, year

    let startDate;
    const endDate = new Date();

    switch (period) {
      case "day":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const summary = await Transaction.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" }
        }
      }
    ]);

    // Calculate totals
    const totalCredit = summary
      .filter(s => ["receive", "deposit", "credit"].includes(s._id))
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const totalDebit = summary
      .filter(s => ["transfer", "bank_transfer", "withdrawal", "debit", "fee"].includes(s._id))
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const netFlow = totalCredit - totalDebit;

    res.status(200).json({
      success: true,
      message: "Transaction summary retrieved successfully",
      data: {
        period,
        startDate,
        endDate,
        summary: {
          totalCredit,
          totalDebit,
          netFlow,
          totalTransactions: summary.reduce((sum, s) => sum + s.count, 0)
        },
        breakdown: summary
      }
    });
  } catch (error) {
    console.error("Error getting transaction summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve transaction summary",
      error: error.message
    });
  }
};