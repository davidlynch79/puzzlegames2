const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    const { session_id } = req.query;

    if (!session_id) {
        return res.status(400).json({ success: false, error: 'Missing session ID' });
    }

    try {
        // Query Stripe directly to verify the session
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session && session.payment_status === 'paid') {
            return.status(200).json({ success: true });
        } else {
            return.status(403).json({ success: false, error: 'Not paid' });
        }
    } catch (error) {
        return.status(500).json({ success: false, error: 'Invalid session' });
    }
};
