import User from "../models/User.js";
import { createFlutterwaveVirtualAccount } from '../utils/flutterWave.js';


// ✅ Get current user profile - FIXED VERSION
export const getMyProfile = async (req, res) => {
    try {
        const user = req.user;
        res.status(200).json({
            id: user._id,
            username: user.username,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            phone: user.phone,
            role: user.role,
            flutterwaveAccountId: user.flutterwaveAccountId,
            hasVirtualAccount: user.hasVirtualAccount,     // ✅ ADD THIS
            bvnSubmitted: user.bvnSubmitted,               // ✅ ADD THIS
            virtualAccountDetails: user.virtualAccountDetails, // ✅ ADD THIS TOO (optional)
            avatar: user.avatar,
            bio: user.bio,
            isVerified: user.isVerified,
            wallets: user.wallets,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ✅ Update user profile
export const updateProfile = async (req, res) => {
    try {
        const updates = req.body;

        // Allow these fields to be updated
        const allowedUpdates = [
            'firstname',
            'lastname',
            'email',
            'phone',
            'bio'
        ];

        // Filter out non-allowed fields
        const filteredUpdates = {};
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        });

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            filteredUpdates,
            { new: true }
        ).select("-password");

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        res.status(200).json(updatedUser);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const submitBVN = async (req, res) => {
    try {
        const { bvn } = req.body;
        if (!bvn || bvn.length !== 11) {
            return res.status(400).json({ message: 'Invalid BVN' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.bvn = bvn;
        user.bvnSubmitted = true;
        user.bvnVerified = true; // ✅ Add this line

        await user.save();

        res.status(200).json({
            message: 'BVN submitted and verified successfully',
            user, // optional: return updated user
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to submit BVN', error: err.message });
    }
};
// BVN VERIFICATION - Enhanced with better error handling and consistency
export const verifyBVNAndCreateAccount = async (req, res) => {
    try {
        const { bvn } = req.body;

        if (!bvn) {
            return res.status(400).json({ message: "BVN is required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 🔥 ENHANCED: Better status checking
        if (user.hasVirtualAccount && user.virtualAccountDetails?.account_number) {
            return res.status(200).json({
                message: "Virtual account already exists",
                virtualAccount: user.virtualAccountDetails,
                // Return success status so frontend can handle appropriately
                success: true,
                alreadyExists: true
            });
        }

        const fullName = `${user.firstname} ${user.lastname}`;

        // Call Flutterwave API
        const flwResponse = await createFlutterwaveVirtualAccount({
            email: user.email,
            bvn,
            name: fullName,
            phone: user.phone,
        });

        if (!flwResponse.account_number || !flwResponse.bank_name) {
            return res.status(400).json({
                message: "Failed to create virtual account",
                error: "Invalid response from payment provider"
            });
        }

        // 🔥 FIXED: Consistent field updates
        user.virtualAccountDetails = {
            account_number: flwResponse.account_number,
            bank_name: flwResponse.bank_name,
            account_name: flwResponse.account_name,
            order_ref: flwResponse.order_ref,
        };

        user.hasVirtualAccount = true;
        user.bvnSubmitted = true;
        user.flutterwaveAccountId = flwResponse.order_ref;

        await user.save();

        return res.status(200).json({
            message: "Virtual account created successfully",
            virtualAccount: user.virtualAccountDetails,
            success: true,
            alreadyExists: false
        });

    } catch (error) {
        console.error("BVN verification error:", error.message);

        // Enhanced error handling
        if (error.message.includes('BVN already exists')) {
            return res.status(400).json({
                message: "This BVN is already associated with another account",
                error: "duplicate_bvn"
            });
        }

        if (error.message.includes('Invalid BVN')) {
            return res.status(400).json({
                message: "Invalid BVN provided",
                error: "invalid_bvn"
            });
        }

        res.status(500).json({
            message: "Something went wrong",
            error: error.message
        });
    }
};