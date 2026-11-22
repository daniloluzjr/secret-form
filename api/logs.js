const { list, del, get } = require('@vercel/blob');
const { Readable } = require('stream');

async function readPrivateJson(url, token) {
    try {
        const res = await get(url, { token, access: 'private' });
        if (!res || !res.stream) return null;
        const nodeStream = Readable.fromWeb(res.stream);
        const chunks = [];
        for await (const chunk of nodeStream) chunks.push(chunk);
        return JSON.parse(Buffer.concat(chunks).toString());
    } catch (e) {
        console.warn('Failed reading private JSON:', e.message);
        return null;
    }
}

module.exports = async (req, res) => {
    // CORS & Cache control
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-supervisor-pin');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        // Simple security gate: Supervisor PIN
        const expectedPin = process.env.SUPERVISOR_PIN || '0909';
        const providedPin = req.headers['x-supervisor-pin'] || req.query.pin;

        if (!providedPin || String(providedPin).trim() !== String(expectedPin).trim()) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized. Please enter the valid Supervisor PIN to access audit logs.'
            });
        }

        const blobToken = process.env.BLOB_READ_WRITE_TOKEN || 'vercel_blob_rw_XnY6D8IdciFOoDiR_DUlCGmaacqSxpPSpdx82nAbjogI6Ic';
        if (!blobToken) {
            return res.status(200).json({
                success: true,
                logs: [],
                configured: false,
                message: 'Vercel Blob Storage is not yet configured.'
            });
        }

        // 1. Fetch metadata files from Vercel Blob
        const { blobs } = await list({
            prefix: 'metadata/',
            token: blobToken,
            limit: 100
        });

        const cutoffTime = Date.now() - (45 * 24 * 60 * 60 * 1000);
        const validBlobs = [];
        const expiredUrls = [];

        blobs.forEach(b => {
            const uploadTime = new Date(b.uploadedAt).getTime();
            if (uploadTime < cutoffTime) {
                expiredUrls.push(b.url);
            } else {
                validBlobs.push(b);
            }
        });

        // Background purge of expired metadata
        if (expiredUrls.length > 0) {
            del(expiredUrls, { token: blobToken }).catch(e => console.warn('Purge error:', e));
        }

        // 2. Fetch JSON details concurrently (up to 50 most recent)
        const sortedBlobs = validBlobs
            .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
            .slice(0, 50);

        const logItems = await Promise.all(sortedBlobs.map(async (blob) => {
            const details = await readPrivateJson(blob.url, blobToken);
            if (!details) return null;

            const uploadTime = new Date(details.createdAt || blob.uploadedAt).getTime();
            const ageDays = Math.floor((Date.now() - uploadTime) / (1000 * 60 * 60 * 24));
            const daysRemaining = Math.max(0, 45 - ageDays);

            return {
                id: details.id,
                title: details.title,
                fileName: details.fileName,
                downloadUrl: details.downloadUrl || `/api/document?id=${details.id}`,
                targetEmail: details.targetEmail,
                metadata: details.metadata || {},
                createdAt: details.createdAt || blob.uploadedAt,
                daysRemaining: daysRemaining
            };
        }));

        const cleanLogs = logItems.filter(Boolean);

        return res.status(200).json({
            success: true,
            configured: true,
            count: cleanLogs.length,
            retentionPolicyDays: 45,
            logs: cleanLogs
        });

    } catch (err) {
        console.error('Error fetching logs:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
