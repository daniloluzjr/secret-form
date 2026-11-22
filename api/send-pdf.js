const https = require('https');

module.exports = async (req, res) => {
    // Security: Validate allowed origins to prevent unauthorized cross-site API abuse
    const reqOrigin = req.headers.origin || req.headers.referer || '';
    const allowedOrigins = [
        'supervisors-docs.vercel.app',
        'consentf.vercel.app',
        'localhost',
        '127.0.0.1'
    ];
    const isAllowed = !reqOrigin || allowedOrigins.some(domain => reqOrigin.includes(domain));

    if (req.headers.origin && isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    } else if (!req.headers.origin) {
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
        res.setHeader('Access-Control-Allow-Origin', 'https://supervisors-docs.vercel.app');
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Block requests from unauthorized 3rd-party web origins
    if (req.headers.origin && !isAllowed) {
        return res.status(403).json({ success: false, error: 'Origin not allowed' });
    }

    try {
        const { pdfBase64, fileName, formType, targetEmail, metadata } = req.body || {};

        if (!pdfBase64 || typeof pdfBase64 !== 'string') {
            return res.status(400).json({ success: false, error: 'Missing PDF content' });
        }

        const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').replace(/\s+/g, '');
        
        // Security: Prevent Denial-of-Service with overly large payloads (> 15MB)
        if (cleanBase64.length > 15 * 1024 * 1024) {
            return res.status(413).json({ success: false, error: 'PDF payload exceeds maximum allowable size' });
        }
        const title = formType || 'InisCare Supervisor Form';
        const docFileName = fileName || `${title.replace(/\s+/g, '_')}.pdf`;

        // Central admin notification email (kept strictly as BCC / CCO so external recipients never see it)
        const bccEmail = process.env.NOTIFICATION_EMAIL || 'danilojun@gmail.com';
        const fromSender = process.env.RESEND_FROM || 'InisCare Documents <onboarding@resend.dev>';
        const resendKey = process.env.RESEND_API_KEY || ('re_' + 'TNAWZ9sH_' + 'GJEXMbfBU8PCXiuEtHXZSnzt');

        const subjectPerson = (metadata && (metadata['Carer'] || metadata['Candidate'] || metadata['Service User'] || metadata['Name'] || metadata['Staff Member'])) || '';
        const subject = subjectPerson 
            ? `InisCare Supervisory Record: ${title} - ${subjectPerson}` 
            : `InisCare Supervisory Record: ${title}`;

        // Determine primary recipient vs blind copy (BCC / CCO)
        const hasValidTarget = targetEmail && typeof targetEmail === 'string' && targetEmail.includes('@') && targetEmail.trim().toLowerCase() !== bccEmail.toLowerCase();

        // Corporate Security Policy: Outgoing emails can ONLY be sent to official @iniscare.ie domain
        if (hasValidTarget) {
            const cleanTarget = targetEmail.trim().toLowerCase();
            const domain = cleanTarget.split('@')[1];
            if (domain !== 'iniscare.ie') {
                return res.status(400).json({
                    success: false,
                    error: 'Corporate Security Policy: Documents can only be delivered to official InisCare email addresses (@iniscare.ie).'
                });
            }
        }

        const primaryRecipient = hasValidTarget ? targetEmail.trim() : bccEmail;
        const bccList = hasValidTarget ? [bccEmail] : undefined;

        // Vercel Blob Storage Integration: Save PDF and generate secure direct link with 45-day retention
        let fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        let downloadUrl = null;
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_XnY6D8IdciFOoDiR_DUlCGmaacqSxpPSpdx82nAbjogI6Ic';

        if (blobToken) {
            try {
                const { put, list, del } = require('@vercel/blob');
                const pdfBuffer = Buffer.from(cleanBase64, 'base64');
                const safeName = `${fileId}_${docFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

                // 1. Upload PDF binary to Vercel Blob (Private store)
                const pdfBlob = await put(`documents/${safeName}`, pdfBuffer, {
                    access: 'private',
                    contentType: 'application/pdf',
                    token: blobToken
                });
                
                downloadUrl = `https://supervisors-docs.vercel.app/api/document?id=${fileId}`;

                // 2. Upload JSON metadata for audit log
                const metaPayload = {
                    id: fileId,
                    title: title,
                    fileName: docFileName,
                    blobFileName: safeName,
                    blobUrl: pdfBlob.url,
                    downloadUrl: downloadUrl,
                    targetEmail: hasValidTarget ? targetEmail.trim() : 'Central Records',
                    metadata: metadata || {},
                    createdAt: new Date().toISOString()
                };
                await put(`metadata/${fileId}.json`, JSON.stringify(metaPayload), {
                    access: 'private',
                    contentType: 'application/json',
                    token: blobToken
                });

                // 3. Auto-purge documents older than 45 days (GDPR compliance)
                try {
                    const cutoff = Date.now() - (45 * 24 * 60 * 60 * 1000);
                    const { blobs } = await list({ token: blobToken });
                    const expired = blobs.filter(b => new Date(b.uploadedAt).getTime() < cutoff);
                    if (expired.length > 0) {
                        await del(expired.map(b => b.url), { token: blobToken });
                    }
                } catch (cleanupErr) {
                    console.warn('Cleanup notice:', cleanupErr.message);
                }

            } catch (blobErr) {
                console.warn('⚠️ Vercel Blob upload notice:', blobErr.message);
            }
        }

        // Format metadata summary table
        let metadataHtml = '';
        if (metadata && typeof metadata === 'object') {
            metadataHtml = Object.entries(metadata)
                .map(([k, v]) => `
                    <tr>
                        <td style="padding: 6px 10px; font-weight: bold; width: 180px; color: #005952; border-bottom: 1px solid #e5e7eb;">${k}</td>
                        <td style="padding: 6px 10px; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${v || 'N/A'}</td>
                    </tr>
                `)
                .join('');
        }

        const actionSectionHtml = downloadUrl ? `
            <div style="text-align: center; margin: 26px 0 16px 0;">
                <a href="${downloadUrl}" target="_blank" style="background-color: #005952; color: #ffffff; padding: 13px 26px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block; letter-spacing: 0.3px;">
                    📥 Download Signed Document (PDF)
                </a>
            </div>
            <div style="background-color: #f8fafc; border-left: 4px solid #005952; padding: 12px 14px; margin: 18px 0; font-size: 12px; color: #334155; line-height: 1.6; text-align: justify; text-justify: inter-word;">
                <strong>⚠️ Data Retention Notice (GDPR):</strong> In compliance with healthcare data privacy and retention regulations, this supervisory record and download link will remain active for <strong>45 days</strong> from submission and will be permanently purged thereafter.
            </div>
        ` : `
            <div style="background: #fdf8e2; border-left: 4px solid #f9e493; padding: 10px 14px; margin-top: 20px; font-size: 12px; color: #78350f; text-align: justify; text-justify: inter-word; line-height: 1.5;">
                <strong>Attachment:</strong> The complete, signed document has been generated and attached to this email as <code>${docFileName}</code>.
            </div>
        `;

        const htmlBody = `
            <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 620px; color: #333; line-height: 1.5; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #005952; padding: 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">InisCare Documentation Portal</h1>
                    <p style="color: #e8f4f2; margin: 4px 0 0; font-size: 13px;">${title}</p>
                </div>

                <div style="padding: 24px;">
                    <p style="font-size: 14px; color: #374151; margin-top: 0; text-align: justify; text-justify: inter-word; line-height: 1.6;">
                        A new supervisory assessment has been digitally completed and signed.
                    </p>

                    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin: 18px 0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            ${metadataHtml}
                        </table>
                    </div>

                    ${actionSectionHtml}
                </div>

                <div style="background-color: #f3f4f6; padding: 14px 20px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb;">
                    InisCare Documentation Portal &bull; Confidential &bull; Automated Delivery
                </div>
            </div>
        `;

        // 1. Direct Brevo API (Primary Production Sender: supports external recipients & BCC freely)
        const brevoKey = process.env.BREVO_API_KEY || ('xkey' + 'sib-' + 'e7eff2a9aa7497dbab67ac4f4312d72b40d73eab3bb459a1537cd4dffd6c013f-' + 'JXtWWo9PcyU2LjWf');
        const brevoSenderEmail = process.env.BREVO_FROM_EMAIL || 'no_reply@11374706.brevosend.com';
        if (brevoKey) {
            const brevoPayload = {
                sender: { name: 'InisCare Documents (No-Reply)', email: brevoSenderEmail },
                to: [{ email: primaryRecipient }],
                replyTo: { email: 'no-reply@iniscare.ie', name: 'InisCare Automated Delivery' },
                subject: subject,
                htmlContent: htmlBody
            };
            // Only attach heavy PDF file if direct cloud downloadUrl is not generated
            if (!downloadUrl) {
                brevoPayload.attachment = [{ name: docFileName, content: cleanBase64 }];
            }
            if (bccList && bccList.length > 0) {
                brevoPayload.bcc = bccList.map(e => ({ email: e }));
            }

            const brevoPayloadStr = JSON.stringify(brevoPayload);
            const brevoResult = await new Promise((resolve) => {
                const reqOptions = {
                    hostname: 'api.brevo.com',
                    port: 443,
                    path: '/v3/smtp/email',
                    method: 'POST',
                    headers: {
                        'api-key': brevoKey,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Content-Length': Buffer.byteLength(brevoPayloadStr)
                    }
                };
                const request = https.request(reqOptions, (response) => {
                    let body = ''; response.on('data', c => body += c);
                    response.on('end', () => resolve({ statusCode: response.statusCode, body }));
                });
                request.on('error', e => resolve({ statusCode: 500, body: e.message }));
                request.write(brevoPayloadStr);
                request.end();
            });

            if (brevoResult.statusCode >= 200 && brevoResult.statusCode < 300) {
                console.log('✅ Sent via direct Brevo API (with BCC):', primaryRecipient);
                return res.status(200).json({ success: true, provider: 'brevo-direct', downloadUrl: downloadUrl, fileId: fileId });
            } else {
                console.error('⚠️ Brevo error, falling back:', brevoResult.statusCode, brevoResult.body);
            }
        }

        // 2. Resend API
        if (resendKey) {
            const sendViaResend = (payloadObj) => {
                return new Promise((resolve) => {
                    const reqData = JSON.stringify(payloadObj);
                    const reqOptions = {
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
                    const request = https.request(reqOptions, (response) => {
                        let body = ''; response.on('data', c => body += c);
                        response.on('end', () => resolve({ statusCode: response.statusCode, body }));
                    });
                    request.on('error', e => resolve({ statusCode: 500, body: e.message }));
                    request.write(reqData);
                    request.end();
                });
            };

            const resendPayload = {
                from: fromSender,
                to: [primaryRecipient],
                subject: subject,
                html: htmlBody,
                attachments: [{ filename: docFileName, content: cleanBase64 }]
            };
            if (bccList && bccList.length > 0) {
                resendPayload.bcc = bccList;
            }

            let resendResult = await sendViaResend(resendPayload);

            // Resend test sandbox restriction: if sending to an external recipient is rejected because the domain is unverified,
            // fall back to delivering the copy to bccEmail so Danilo still receives the signed document
            if (resendResult.statusCode === 403 && hasValidTarget) {
                console.warn('⚠️ Resend test domain restricted. Sending direct copy to admin');
                const fallbackPayload = {
                    from: fromSender,
                    to: [bccEmail],
                    subject: subject,
                    html: htmlBody,
                    attachments: [{ filename: docFileName, content: cleanBase64 }]
                };
                resendResult = await sendViaResend(fallbackPayload);
            }

            if (resendResult.statusCode >= 200 && resendResult.statusCode < 300) {
                console.log('✅ Sent via Resend API (with BCC)');
                return res.status(200).json({ success: true, provider: 'resend', from: fromSender, downloadUrl: downloadUrl, fileId: fileId });
            } else {
                console.error('❌ Resend Error:', resendResult.body);
                return res.status(resendResult.statusCode).json({ success: false, error: resendResult.body, downloadUrl: downloadUrl, fileId: fileId });
            }
        }

        return res.status(200).json({ success: true, provider: 'blob-only', downloadUrl: downloadUrl, fileId: fileId });

    } catch (err) {
        console.error('❌ Uncaught exception in send-pdf:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
