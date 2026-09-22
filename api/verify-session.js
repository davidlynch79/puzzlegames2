const jwt = require('jsonwebtoken');

export default function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405.json({ error: 'Method not allowed' }));
    }

    try {
        // Extract token from the Authorization header ("Bearer <token>")
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify the token using your environment variable secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Optional: Check if the user has an active subscription status tied to Stripe
        if (!decoded.activeSubscriber) {
            return res.status(403).json({ error: 'Subscription inactive' });
        }

        // Session is completely valid
        return res.status(200).json({ 
            success: true, 
            userId: decoded.userId,
            message: 'Session verified successfully' 
        });

    } catch (error) {
        // Token verification failed (expired, invalid signature, etc.)
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
