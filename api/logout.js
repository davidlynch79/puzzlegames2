module.exports = (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const secure = process.env.NODE_ENV === 'development' ? '' : ' Secure;';
    res.setHeader('Set-Cookie', `arcade_token=; HttpOnly;${secure} Path=/; Max-Age=0; SameSite=Lax`);
    return res.status(200).json({ success: true });
};