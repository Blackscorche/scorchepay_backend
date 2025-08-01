import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// ✅ Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';
const FLW_SECRET_KEY = isProduction
    ? process.env.FLW_SECRET_KEY_LIVE
    : process.env.FLW_SECRET_KEY_TEST;

const FLW_BASE_URL = "https://api.flutterwave.com/v3";

// ✅ Test account numbers that work in sandbox
const TEST_ACCOUNT_NUMBERS = {
    "044": "0690000031", // Access Bank test account
    "033": "0123456789", // United Bank test account
    "058": "0123456789", // GTBank test account
    "011": "1234567890", // First Bank test account
    "221": "1234567890", // Stanbic test account
};

/**
 * Get test account for a specific bank (sandbox only)
 */
const getTestAccountForBank = (bankCode) => {
    if (isProduction) return null;
    return TEST_ACCOUNT_NUMBERS[bankCode] || "0123456789";
};

/**
 * Create a permanent virtual account using Flutterwave API
 * @param {Object} userDetails - { email, bvn, name, phone }
 */
export const createFlutterwaveVirtualAccount = async ({ email, bvn, name, phone }) => {
    try {
        // ✅ Use test BVN in development
        const testBvn = isProduction ? bvn : "12345678901";

        console.log(`🔧 ${isProduction ? 'LIVE' : 'TEST'} MODE: Creating virtual account for ${name}`);

        const response = await axios.post(
            `${FLW_BASE_URL}/virtual-account-numbers`,
            {
                email,
                bvn: testBvn,
                is_permanent: true,
                tx_ref: `SCORCHEPAY-${Date.now()}`,
                narration: "ScorchePay Wallet Account",
                amount: 0,
                frequency: 0,
                duration: 0,
                type: "savings",
                phone_number: phone,
                fullname: name,
            },
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const accountData = response.data.data;

        // Add test mode indicator
        if (!isProduction) {
            accountData._testMode = true;
            accountData._testNotice = "This is a test virtual account";
        }

        return accountData;
    } catch (error) {
        console.error("Flutterwave Virtual Account Error:", error?.response?.data || error.message);
        throw new Error(
            error?.response?.data?.message || "Failed to create virtual account"
        );
    }
};

/**
 * Initiate bank transfer using Flutterwave API
 * @param {Object} transferDetails - { account_number, account_bank, amount, narration, reference, beneficiary_name }
 */
// Add this to your flutterwave utils as a temporary workaround
export const initiateFlutterwaveTransfer = async ({
    account_number,
    account_bank,
    amount,
    narration = "Bank Transfer",
    reference,
    beneficiary_name
}) => {
    try {
        // ✅ Debug logging
        console.log('🔧 Transfer Debug Info:');
        console.log('- Environment:', process.env.NODE_ENV);
        console.log('- Is Production:', isProduction);
        console.log('- FLW_SECRET_KEY exists:', !!FLW_SECRET_KEY);

        // ✅ In DEVELOPMENT MODE, simulate the transfer instead of calling Flutterwave
        if (!isProduction) {
            console.log('🧪 DEVELOPMENT MODE: Simulating transfer instead of calling Flutterwave API');
            console.log(`💸 SIMULATED TRANSFER: ₦${amount} to ${account_number} (${account_bank})`);

            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Return a mock successful response that matches Flutterwave's format
            return {
                status: 'success',
                message: 'Transfer initiated successfully (SIMULATED)',
                data: {
                    id: `mock_${Date.now()}`,
                    account_number,
                    account_bank,
                    amount,
                    currency: 'NGN',
                    reference,
                    status: 'NEW',
                    complete_message: 'Transfer queued successfully (SIMULATED)',
                    beneficiary_name: beneficiary_name || 'Test Beneficiary',
                    created_at: new Date().toISOString()
                },
                _testMode: true,
                _simulatedTransfer: true,
                _notice: 'This is a simulated transfer for development - no real money moved'
            };
        }

        // ✅ For PRODUCTION, try the real API call
        console.log(`💸 LIVE TRANSFER: ₦${amount} to ${account_number}`);

        const transferPayload = {
            account_bank: String(account_bank),
            account_number,
            amount: Number(amount),
            narration: narration || "Transfer from ScorchePay",
            currency: "NGN",
            reference,
            callback_url: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/webhook/flutterwave/transfer` : undefined,
            debit_currency: "NGN",
            beneficiary_name: beneficiary_name || "Beneficiary"
        };

        console.log('🔍 Transfer Payload:', JSON.stringify(transferPayload, null, 2));

        const response = await axios.post(
            `${FLW_BASE_URL}/transfers`,
            transferPayload,
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000
            }
        );

        console.log('✅ Flutterwave Response:', JSON.stringify(response.data, null, 2));
        return response.data;

    } catch (error) {
        console.error("❌ Flutterwave Transfer Error:");
        console.error("- Status:", error?.response?.status);
        console.error("- Data:", JSON.stringify(error?.response?.data, null, 2));

        // ✅ In development, if Flutterwave fails, return simulated success
        if (!isProduction) {
            console.log('🔄 Flutterwave API failed in development, returning simulated success...');
            return {
                status: 'success',
                message: 'Transfer simulated (API failed)',
                data: {
                    id: `fallback_${Date.now()}`,
                    account_number,
                    account_bank,
                    amount,
                    currency: 'NGN',
                    reference,
                    status: 'NEW',
                    complete_message: 'Transfer simulated due to API restrictions',
                    beneficiary_name: beneficiary_name || 'Test Beneficiary',
                    created_at: new Date().toISOString()
                },
                _testMode: true,
                _simulatedTransfer: true,
                _fallback: true,
                _notice: 'Simulated due to Flutterwave account restrictions'
            };
        }

        // ✅ Enhanced error handling for production
        if (error?.response?.data?.message?.includes('account administrator')) {
            throw new Error('Flutterwave account not activated for transfers. Please contact Flutterwave support.');
        }

        throw new Error(error?.response?.data?.message || error.message || "Transfer failed");
    }
};
/**
 * Resolve account number to get account name
 * @param {Object} accountDetails - { account_number, account_bank }
 */
export const resolveFlutterwaveAccount = async ({ account_number, account_bank }) => {
    try {
        console.log(`🔍 ${isProduction ? 'LIVE' : 'TEST'} MODE: Resolving account ${account_number}`);

        const response = await axios.post(
            `${FLW_BASE_URL}/accounts/resolve`,
            {
                account_number,
                account_bank
            },
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const accountData = response.data.data;

        // In test mode, Flutterwave often returns generic test names
        if (!isProduction && accountData.account_name === "TEST ACCOUNT") {
            accountData.account_name = "John Doe Test Account";
        }

        return accountData;
    } catch (error) {
        console.error("Flutterwave Account Resolve Error:", error?.response?.data || error.message);

        // In test mode, return a dummy response if resolution fails
        if (!isProduction) {
            console.log("🧪 TEST MODE: Returning dummy account resolution");
            return {
                account_number,
                account_name: "Test Account Holder",
                _testMode: true
            };
        }

        throw new Error(
            error?.response?.data?.message || "Failed to resolve account"
        );
    }
};

/**
 * Verify transaction status using Flutterwave API
 */
export const verifyFlutterwaveTransaction = async (transactionId) => {
    try {
        console.log(`✅ ${isProduction ? 'LIVE' : 'TEST'} MODE: Verifying transaction ${transactionId}`);

        const response = await axios.get(
            `${FLW_BASE_URL}/transfers/${transactionId}`,
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.data;
    } catch (error) {
        console.error("Flutterwave Verify Error:", error?.response?.data || error.message);
        throw new Error(
            error?.response?.data?.message || "Failed to verify transaction"
        );
    }
};

/**
 * Get list of supported banks
 */
export const getFlutterwaveBanks = async () => {
    try {
        const response = await axios.get(
            `${FLW_BASE_URL}/banks/NG`,
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.data;
    } catch (error) {
        console.error("Flutterwave Banks Error:", error?.response?.data || error.message);
        throw new Error(
            error?.response?.data?.message || "Failed to fetch banks"
        );
    }
};

/**
 * Get transfer fee for a specific amount and bank
 */
export const getFlutterwaveTransferFee = async ({ amount, currency = "NGN" }) => {
    try {
        const response = await axios.get(
            `${FLW_BASE_URL}/transfers/fee?amount=${amount}&currency=${currency}`,
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.data;
    } catch (error) {
        console.error("Flutterwave Fee Error:", error?.response?.data || error.message);
        // Return default fee if API fails
        return { fee: isProduction ? 50 : 10 }; // Lower fee in test mode
    }
};

/**
 * Validate webhook signature
 */
export const validateFlutterwaveWebhook = (signature, payload) => {
    const crypto = require('crypto');
    const secretHash = process.env.FLW_SECRET_HASH;

    if (!secretHash) {
        console.error("FLW_SECRET_HASH not configured");
        return false;
    }

    const hash = crypto
        .createHmac('sha256', secretHash)
        .update(JSON.stringify(payload))
        .digest('hex');

    return hash === signature;
};

/**
 * Get wallet balance from Flutterwave
 */
export const getFlutterwaveWalletBalance = async (currency = "NGN") => {
    try {
        const response = await axios.get(
            `${FLW_BASE_URL}/balances/${currency}`,
            {
                headers: {
                    Authorization: `Bearer ${FLW_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.data;
    } catch (error) {
        console.error("Flutterwave Balance Error:", error?.response?.data || error.message);
        throw new Error(
            error?.response?.data?.message || "Failed to get wallet balance"
        );
    }
};