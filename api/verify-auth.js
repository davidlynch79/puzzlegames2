const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    try {
        const cookieHeader = req.headers.cookie || '';
        // Added .trim() to prevent whitespace bugs when reading cookies
        const cookies = Object.fromEntries(
            cookieHeader.split(';').map(c => c.trim().split('='))
        );
        const token = cookies.arcade_token;

        if (!token) {
            return res.status(403).json({ success: false, error: 'Not logged in' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const subscriptions = await stripe.subscriptions.list({
            customer: decoded.customerId,
            status: 'active',
            limit: 1
        });

        if (subscriptions.data.length > 0) {
            return res.status(200).json({ success: true });
        }

        return res.status(403).json({ success: false, error: 'Subscription expired' });
    } catch (error) {
        return res.status(403).json({ success: false, error: 'Invalid session' });
    }
};
