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

        const email = typeof body?.email === 'string' ? body.email.trim() : '';
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ success: false, error: 'Missing JWT_SECRET in Vercel settings' });
        }

        if (!process.env.STRIPE_SECRET_KEY) {
            return res.status(500).json({ success: false, error: 'Missing STRIPE_SECRET_KEY in Vercel settings' });
        }

        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const normalizedEmail = email.toLowerCase();
        const customerRecords = new Map();

        for (const emailQuery of new Set([email, normalizedEmail])) {
            let startingAfter;
            let hasMore = true;

            while (hasMore) {
                const params = { email: emailQuery, limit: 100 };
                if (startingAfter) params.starting_after = startingAfter;
                const page = await stripe.customers.list(params);

                for (const customer of page.data) {
                    if (customer.email?.trim().toLowerCase() === normalizedEmail) {
                        customerRecords.set(customer.id, customer);
                    }
                }

                hasMore = page.has_more;
                startingAfter = hasMore ? page.data[page.data.length - 1]?.id : undefined;
                if (hasMore && !startingAfter) break;
            }
        }

        if (customerRecords.size === 0) {
            return res.status(403).json({
                success: false,
                code: 'customer_not_found',
                error: 'No subscriber found with this email'
            });
        }

        let customerId;
        for (const customer of customerRecords.values()) {
            const subscriptions = await stripe.subscriptions.list({
                customer: customer.id,
                status: 'active',
                limit: 1
            });
            if (subscriptions.data.length > 0) {
                customerId = customer.id;
                break;
            }
        }

        if (!customerId) {
            return res.status(403).json({
                success: false,
                code: 'no_active_subscription',
                error: 'No active subscription was found for this email'
            });
        }

        // 3. Create a signed token
        const token = jwt.sign({ customerId }, process.env.JWT_SECRET, { expiresIn: '7d' });

        const secure = process.env.NODE_ENV === 'development' ? '' : ' Secure;';
        const cookieFlags = `arcade_token=${token}; HttpOnly;${secure} Path=/; Max-Age=604800; SameSite=Lax`;

        res.setHeader('Set-Cookie', cookieFlags);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Subscriber login failed:', error);
        return res.status(500).json({ success: false, error: 'We could not verify your subscription. Please try again.' });
    }
};
