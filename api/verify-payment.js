


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    const { session_id } = req.query;

    if (!session_id) {
        return res.status(400).json({ success: false, error: 'Missing session ID' });
    }

    try {
        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id, {
            expand: ['subscription'] // Expand the subscription object
        });

        // Check if the session mode was a subscription and if it's active
        if (session && session.mode === 'subscription') {
            const subscription = session.subscription;
            if (subscription && subscription.status === 'active') {
                return res.status(200).json({ success: true });
            }
        }

        return res.status(403).json({ success: false, error: 'Subscription not active' });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Invalid session' });
    }
};
