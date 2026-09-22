const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    try {
        // Parse cookies from request headers
        const cookieHeader = req.headers.cookie || '';
        const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
        const token = cookies.arcade_token;

        if (!token) {
            return res.status(403).json({ success: false, error: 'Not logged in' });
        }

        // Verify the cryptographic signature of the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Double-check with Stripe that their subscription is still active
        const subscriptions = await stripe.subscriptions.list({
            customer: decoded.customerId,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length > 0) {
            return.status(200).json({ success: true });
        }

        return res.status(403).json({ success: false, error: 'Subscription expired' });
    } catch (error) {
        return.status(403).json({ success: false, error: 'Invalid session' });
    }
};
