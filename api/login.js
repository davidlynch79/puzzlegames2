const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }

    try {
        // 1. Find customer in Stripe by email
        const customers = await stripe.customers.list({ email: email, limit: 1 });
        if (customers.data.length === 0) {
            return res.status(403).json({ success: false, error: 'No subscriber found with this email' });
        }

        const customerId = customers.data[0].id;

        // 2. Check if they have an active subscription
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length === 0) {
            return res.status(403).json({ success: false, error: 'Subscription is not active' });
        }

        // 3. Create a signed token containing their customer ID (expires in 7 days)
        const token = jwt.sign({ customerId }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // 4. Set a secure, HTTP-only cookie so the browser handles it safely
        res.setHeader('Set-Cookie', `arcade_token=${token}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax`);

        return.status(200).json({ success: true });
    } catch (error) {
        return.status(500).json({ success: false, error: 'Server error' });
    }
};
