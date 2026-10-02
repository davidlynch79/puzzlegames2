const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'POST'].includes(req.method)) {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const cookieHeader = req.headers.cookie || '';
        const token = cookieHeader
            .split(';')
            .map(cookie => cookie.trim())
            .find(cookie => cookie.startsWith('arcade_token='))
            ?.slice('arcade_token='.length);

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
