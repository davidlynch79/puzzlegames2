const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        // Ensure body is parsed correctly
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const email = body?.email;
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ success: false, error: 'Missing JWT_SECRET in Vercel settings' });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ success: false, error: 'Missing STRIPE_SECRET_KEY in Vercel settings' });
        }

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

        // 3. Create a signed token
        const token = jwt.sign({ customerId }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // 4. Set cookie (Note: Secure flag requires HTTPS. If testing locally on http://, remove '; Secure')
        const cookieFlags = process.env.NODE_ENV === 'development' 
            ? `arcade_token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`
            : `arcade_token=${token}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax`;

        res.setHeader('Set-Cookie', cookieFlags);

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message || 'Server error' });
    }
};
