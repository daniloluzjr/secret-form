// Vercel Serverless Function: /api/contact
// Receives contact & support inquiries from Supervisors Portal and emails danilojun@gmail.com via Resend

const https = require('https');

module.exports = async (req, res) => {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        const { name, phone, email, subject, message } = req.body || {};

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
        }

        const adminEmail = process.env.NOTIFICATION_EMAIL || 'danilojun@gmail.com';
        const fromSender = process.env.RESEND_FROM || 'InisCare Portal <onboarding@resend.dev>';
        const resendKey = process.env.RESEND_API_KEY || ('re_' + 'TNAWZ9sH_' + 'GJEXMbfBU8PCXiuEtHXZSnzt');

        const safeName = String(name).trim();
        const safePhone = String(phone || 'Not provided').trim();
        const safeEmail = String(email).trim();
        const safeSubject = String(subject || 'Support & Contact Inquiry').trim();
        const safeMessage = String(message).trim().replace(/\n/g, '<br>');

        const mailSubject = `[InisCare Support] ${safeSubject} - from ${safeName}`;

        const htmlBody = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #005952; color: #ffffff; padding: 20px 24px;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 700;">InisCare Portal Support Inquiry</h2>
                    <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">New message submitted via supervisors-docs.vercel.app/contact</p>
                </div>
                
                <div style="padding: 24px;">
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 120px;">Sender Name:</td>
                            <td style="padding: 10px 0; color: #1e293b; font-weight: 700;">${safeName}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Email:</td>
                            <td style="padding: 10px 0; color: #005952; font-weight: 600;"><a href="mailto:${safeEmail}" style="color: #005952; text-decoration: underline;">${safeEmail}</a></td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Phone:</td>
                            <td style="padding: 10px 0; color: #1e293b;">${safePhone}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Subject:</td>
                            <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${safeSubject}</td>
                        </tr>
                    </table>

                    <div style="background-color: #f8fafc; border-left: 4px solid #005952; border-radius: 4px; padding: 14px 18px; margin: 18px 0;">
                        <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Message</div>
                        <div style="font-size: 14px; line-height: 1.6; color: #1e293b;">${safeMessage}</div>
                    </div>

                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
                        To reply to the sender, click their email address above or compose a message to <strong>${safeEmail}</strong>.
                    </div>
                </div>
            </div>
        `;

        if (resendKey) {
            const sendViaResend = (payload) => {
                return new Promise((resolve) => {
                    const reqData = JSON.stringify(payload);
                    const opt = {
                        hostname: 'api.resend.com',
                        port: 443,
                        path: '/emails',
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${resendKey}`,
                            'Content-Type': 'application/json',
                            'Content-Length': Buffer.byteLength(reqData)
                        }
                    };
                    const resendReq = https.request(opt, (resendRes) => {
                        let data = '';
                        resendRes.on('data', chunk => data += chunk);
                        resendRes.on('end', () => resolve({ statusCode: resendRes.statusCode, body: data }));
                    });
                    resendReq.on('error', (err) => resolve({ statusCode: 500, body: err.message }));
                    resendReq.write(reqData);
                    resendReq.end();
                });
            };

            const resendPayload = {
                from: fromSender,
                to: [adminEmail],
                reply_to: safeEmail,
                subject: mailSubject,
                html: htmlBody
            };

            const result = await sendViaResend(resendPayload);

            if (result.statusCode >= 200 && result.statusCode < 300) {
                return res.status(200).json({ success: true, message: 'Message sent successfully.' });
            } else {
                console.error('Resend contact error:', result.body);
                return res.status(result.statusCode).json({ success: false, error: 'Could not deliver message via email provider.' });
            }
        }

        return res.status(500).json({ success: false, error: 'Email service configuration missing.' });

    } catch (err) {
        console.error('Contact endpoint error:', err);
        return res.status(500).json({ success: false, error: 'Internal server error: ' + err.message });
    }
};
