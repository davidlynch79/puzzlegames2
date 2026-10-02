/**
 * Shared membership check for the puzzlegames2 site.
 *
 * Every paid route calls verifyMembership() before it does anything else, so
 * the same rule applies everywhere: a valid HttpOnly session cookie plus a
 * currently active Stripe subscription. Extracted from verify-auth.js so the
 * logic is not duplicated (and cannot drift) between endpoints.
 */
const jwt = require("jsonwebtoken");
const stripe = require("stripe");

const COOKIE_NAME = "arcade_token";

function readSessionToken(req) {
    const cookieHeader = req.headers.cookie || "";
    return cookieHeader
        .split(";")
        .map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith(COOKIE_NAME + "="))
        ?.slice((COOKIE_NAME + "=").length);
}

/**
 * @returns {Promise<{ok: boolean, code: string, customerId?: string}>}
 *   ok === true only when a session exists AND Stripe reports an active
 *   subscription. Any failure resolves to ok === false rather than throwing,
 *   so a Stripe outage can never be mistaken for a valid membership.
 */
async function verifyMembership(req) {
    if (!process.env.JWT_SECRET || !process.env.STRIPE_SECRET_KEY) {
        console.error("Missing JWT_SECRET or STRIPE_SECRET_KEY in environment");
        return { ok: false, code: "server_misconfigured" };
    }

    const token = readSessionToken(req);
    if (!token) {
        return { ok: false, code: "not_logged_in" };
    }

    let customerId;
    try {
        customerId = jwt.verify(token, process.env.JWT_SECRET)?.customerId;
    } catch (error) {
        return { ok: false, code: "invalid_session" };
    }
    if (!customerId) {
        return { ok: false, code: "invalid_session" };
    }

    try {
        const subscriptions = await stripe(process.env.STRIPE_SECRET_KEY).subscriptions.list({
            customer: customerId,
            status: "active",
            limit: 1
        });
        if (!subscriptions.data || subscriptions.data.length === 0) {
            return { ok: false, code: "no_active_subscription" };
        }
        return { ok: true, code: "active", customerId };
    } catch (error) {
        // A Stripe failure must never fall open.
        console.error("Subscription lookup failed:", error);
        return { ok: false, code: "verification_failed" };
    }
}

module.exports = { verifyMembership, readSessionToken, COOKIE_NAME };
