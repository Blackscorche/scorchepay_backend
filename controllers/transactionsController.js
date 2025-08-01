import Transaction from '../models/Transactions.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// ✅ FIXED - Get user transactions with proper schema matching
export const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 50,
      type,
      category,
      search,
      startDate,
      endDate
    } = req.query;

    console.log('🔍 Fetching transactions for user:', userId);
    console.log('📊 Query params:', req.query);

    // ✅ Build query - Use $or to find transactions where user is sender OR receiver
    const query = {
      $or: [
        { from: userId }, // User is sender
        { to: userId }     // User is receiver
      ]
    };

    // Add type filter
    if (type && type !== 'all') {
      // Map frontend type to backend types
      if (type === 'income') {
        // For income, find transactions where user is receiver OR giftcard sales
        query.$and = [
          {
            $or: [
              { to: userId }, // User received money
              { type: 'giftcard', from: userId, status: 'completed' } // User sold giftcard
            ]
          }
        ];
      } else if (type === 'expense') {
        // For expenses, find transactions where user is sender (except giftcard sales)
        query.$and = [
          { from: userId },
          { type: { $ne: 'giftcard' } } // Exclude giftcard sales
        ];
      } else {
        query.type = type;
      }
    }

    // Add category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Add search filter
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { paymentRef: { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Add date range filter
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }
      query.createdAt = dateFilter;
    }

    console.log('🔍 Final query:', JSON.stringify(query, null, 2));

    // Calculate pagination
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Get total count for pagination
    const totalTransactions = await Transaction.countDocuments(query);
    console.log('📊 Total transactions found:', totalTransactions);

    const totalPages = Math.ceil(totalTransactions / limitNumber);

    // Fetch transactions with pagination
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limitNumber)
      .populate('from', 'username firstname lastname')
      .populate('to', 'username firstname lastname')
      .lean();

    console.log('📋 Fetched transactions:', transactions.length);

    // ✅ Format transactions for frontend with proper type mapping
    const formattedTransactions = transactions.map(transaction => {
      // Determine if this is income or expense for the current user
      let transactionType = transaction.type;

      if (transaction.to && transaction.to._id.toString() === userId.toString()) {
        // User is receiver - this is income
        transactionType = 'income';
      } else if (transaction.from._id.toString() === userId.toString()) {
        // User is sender
        if (transaction.type === 'giftcard' && transaction.status === 'completed') {
          transactionType = 'income'; // Giftcard sale is income
        } else {
          transactionType = 'expense'; // Other outgoing transactions are expenses
        }
      }

      return {
        id: transaction._id,
        type: transactionType,
        amount: transaction.amount,
        fee: transaction.fee || 0,
        title: transaction.title,
        description: transaction.description,
        category: transaction.category,
        status: transaction.status,
        date: transaction.createdAt,
        time: getTimeAgo(transaction.createdAt),
        paymentRef: transaction.paymentRef,
        from: transaction.from ? {
          id: transaction.from._id,
          username: transaction.from.username,
          name: `${transaction.from.firstname || ''} ${transaction.from.lastname || ''}`.trim()
        } : null,
        to: transaction.to ? {
          id: transaction.to._id,
          username: transaction.to.username,
          name: `${transaction.to.firstname || ''} ${transaction.to.lastname || ''}`.trim()
        } : null,
        metadata: transaction.metadata || {}
      };
    });

    res.status(200).json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalTransactions,
        pages: totalPages,
        hasNext: pageNumber < totalPages,
        hasPrev: pageNumber > 1
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transactions'
    });
  }
};

// ✅ FIXED - Get transaction statistics with proper schema
export const getTransactionStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.query;

    console.log('📊 Fetching stats for user:', userId);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days, 10));

    // ✅ Fixed aggregation - Use $or to find user's transactions
    const stats = await Transaction.aggregate([
      {
        $match: {
          $or: [
            { from: new mongoose.Types.ObjectId(userId) },
            { to: new mongoose.Types.ObjectId(userId) }
          ],
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [
                {
                  $or: [
                    // User received money (transfer/deposit)
                    { $eq: ['$to', new mongoose.Types.ObjectId(userId)] },
                    // User sold giftcard (completed giftcard transaction)
                    {
                      $and: [
                        { $eq: ['$from', new mongoose.Types.ObjectId(userId)] },
                        { $eq: ['$type', 'giftcard'] },
                        { $eq: ['$status', 'completed'] }
                      ]
                    }
                  ]
                },
                '$amount',
                0
              ]
            }
          },
          totalExpenses: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$from', new mongoose.Types.ObjectId(userId)] },
                    { $ne: ['$type', 'giftcard'] } // Exclude giftcard sales from expenses
                  ]
                },
                { $add: ['$amount', { $ifNull: ['$fee', 0] }] },
                0
              ]
            }
          },
          totalTransactions: { $sum: 1 }
        }
      }
    ]);

    const result = stats[0] || {
      totalIncome: 0,
      totalExpenses: 0,
      totalTransactions: 0
    };

    const balance = result.totalIncome - result.totalExpenses;

    console.log('📊 Stats result:', result);

    res.status(200).json({
      success: true,
      stats: {
        income: result.totalIncome,
        expenses: result.totalExpenses,
        balance: balance,
        totalTransactions: result.totalTransactions
      }
    });

  } catch (error) {
    console.error('❌ Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transaction statistics'
    });
  }
};

// ✅ Helper function to get time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInHours = Math.floor((now - new Date(date)) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 14) return '1 week ago';

  return `${Math.floor(diffInDays / 7)} weeks ago`;
}

// ✅ Also add a simple test endpoint to check if transactions exist
export const testTransactions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all transactions for this user
    const allTransactions = await Transaction.find({
      $or: [
        { from: userId },
        { to: userId }
      ]
    }).lean();

    // Get user info
    const user = await User.findById(userId).select('username firstname lastname').lean();

    res.json({
      success: true,
      message: 'Transaction test results',
      data: {
        userId,
        user,
        totalTransactions: allTransactions.length,
        transactions: allTransactions.slice(0, 5), // Show first 5
        transactionTypes: [...new Set(allTransactions.map(t => t.type))],
        transactionStatuses: [...new Set(allTransactions.map(t => t.status))]
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};