const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config(); // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'https://your-frontend-url.com'],
    methods: ['GET', 'POST'],
    credentials: true
}));app.use(bodyParser.json());

// Initialize Razorpay instance with your keys
const razorpay = new Razorpay({
    key_id: "rzp_test_R7ucy9bfW3v6nk",
    key_secret: "BNL7jidA4k0VFJep4QJ3P1UR",
});

// --- API Endpoint 1: To Create a Razorpay Order ---
app.post('/create-order', async (req, res) => {
    try {
        const { amount, currency } = req.body;

        console.log("Incoming create-order request:", req.body);

        if (!amount || !currency) {
            console.error("Missing amount or currency");
            return res.status(400).json({ message: 'Amount and currency are required.' });
        }

        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: `receipt_order_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        console.log("Razorpay order created:", order);

        res.status(200).json({
            id: order.id,
            currency: order.currency,
            amount: order.amount
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Internal Server Error', details: error.message });
    }
});


// --- API Endpoint 2: To Verify the Payment Signature ---
app.post('/verify-payment', (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const body = razorpay_order_id + '|' + razorpay_payment_id;

        // Create a signature using HMAC-SHA256 with your Key Secret
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        // Compare the signatures
        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Payment is verified. This is where you would update your Sanity order status.
            // Example: A call to your Sanity client to update the order document.
            console.log("Payment is successful and signature is verified!");
            res.status(200).json({ status: 'success', message: 'Payment verified successfully.' });
        } else {
            // Signature mismatch. This indicates a potential security issue.
            console.log("Payment signature verification failed.");
            res.status(400).json({ status: 'failure', message: 'Invalid signature.' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});