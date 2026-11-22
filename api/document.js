const { get, head } = require('@vercel/blob');
const { Readable } = require('stream');

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_XnY6D8IdciFOoDiR_DUlCGmaacqSxpPSpdx82nAbjogI6Ic';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const docId = req.query.id;
        if (!docId || typeof docId !== 'string') {
            return res.status(400).send('Invalid or missing document ID.');
        }

        const safeId = docId.replace(/[^a-zA-Z0-9_-]/g, '');
        const metaPath = `metadata/${safeId}.json`;

        // 1. Fetch metadata
        let metaDetails = null;
        try {
            const metaBlobRes = await get(metaPath, { token: BLOB_TOKEN, access: 'private' });
            if (metaBlobRes && metaBlobRes.stream) {
                const nodeStream = Readable.fromWeb(metaBlobRes.stream);
                const chunks = [];
                for await (const chunk of nodeStream) chunks.push(chunk);
                metaDetails = JSON.parse(Buffer.concat(chunks).toString());
            }
        } catch (e) {
            console.warn('Metadata not found for docId:', safeId);
        }

        // 2. Check 45-day retention
        if (metaDetails && metaDetails.createdAt) {
            const ageDays = (Date.now() - new Date(metaDetails.createdAt).getTime()) / (1000 * 60 * 60 * 24);
            if (ageDays > 45) {
                return res.status(410).send(`
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 60px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
                        <h2 style="color: #b91c1c; margin-top: 0;">Document Expired (45-Day Retention Policy)</h2>
                        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                            In accordance with InisCare healthcare data protection (GDPR) and regulatory compliance policies, this document has reached its 45-day retention limit and has been permanently purged from cloud storage.
                        </p>
                        <a href="/log" style="display: inline-block; margin-top: 16px; padding: 10px 18px; background: #005952; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">Return to Portal Logs</a>
                    </div>
                `);
            }
        }

        const docPath = metaDetails ? `documents/${metaDetails.blobFileName || metaDetails.fileName || safeId}` : `documents/${safeId}`;
        const downloadFilename = (metaDetails && metaDetails.fileName) || `InisCare_Document_${safeId}.pdf`;

        // 3. Fetch PDF binary stream
        // Try direct path or the stored blob url
        let pdfTarget = (metaDetails && metaDetails.blobUrl) ? metaDetails.blobUrl : docPath;
        const pdfRes = await get(pdfTarget, { token: BLOB_TOKEN, access: 'private' });

        if (!pdfRes || pdfRes.statusCode >= 400 || !pdfRes.stream) {
            return res.status(404).send('Document not found or has been purged.');
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${downloadFilename.replace(/"/g, '')}"`);
        res.setHeader('Cache-Control', 'private, max-age=86400');

        const stream = Readable.fromWeb(pdfRes.stream);
        stream.pipe(res);

    } catch (err) {
        console.error('Error serving document:', err);
        return res.status(500).send('Error retrieving document: ' + err.message);
    }
};
