/**
 * InisCare PDF Delivery & Modal Utility
 * Handles mobile WebView downloads, cloud uploads, native OS share and desktop saving.
 */
window.deliverPdf = async function(options) {
    const { pdfBlob, fileName, formType, targetEmail, metadata, origBtn, origHtml } = options;

    // 1. Silent cloud audit backup in background (DO NOT await so user gesture is preserved!)
    let downloadUrlPromise = (async () => {
        try {
            const base64data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(pdfBlob);
            });

            const safeTarget = (targetEmail && targetEmail.toLowerCase().endsWith('@iniscare.ie')) ? targetEmail : '';
            const res = await fetch('/api/send-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdfBase64: base64data,
                    fileName: fileName,
                    formType: formType,
                    targetEmail: safeTarget,
                    metadata: metadata || {}
                })
            });

            if (res.ok) {
                const resData = await res.json();
                return resData.downloadUrl || null;
            }
        } catch (e) {
            console.warn('Silent cloud backup notice:', e);
        }
        return null;
    })();

    // 2. Reset trigger button state
    if (origBtn && origHtml) {
        origBtn.innerHTML = origHtml;
        origBtn.disabled = false;
    }

    const shareTitle = fileName.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    const shareText = `InisCare: ${shareTitle}`;
    let file = null;
    try {
        file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    } catch (e) {}

    // 3. Show clean delivery modal with explicit Download and Share options
    const downloadUrl = await downloadUrlPromise;
    showPdfDeliveryModal(fileName, pdfBlob, downloadUrl, file);
};

function showPdfDeliveryModal(fileName, pdfBlob, downloadUrl, file) {
    const existing = document.getElementById('pdfSuccessModal');
    if (existing) existing.remove();

    const targetDocUrl = downloadUrl || '';
    const googleViewerUrl = downloadUrl ? `https://docs.google.com/viewer?url=${encodeURIComponent(downloadUrl)}` : '';
    const shareTitle = fileName.replace(/\.pdf$/i, '').replace(/_/g, ' ');
    const shareText = `InisCare: ${shareTitle}`;

    if (!file && pdfBlob) {
        try {
            file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        } catch (e) {}
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'pdfSuccessModal';
    backdrop.className = 'pdf-modal-backdrop';
    backdrop.innerHTML = `
        <div class="pdf-modal-card">
            <div class="pdf-modal-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <h3>PDF Generated Successfully!</h3>
            <div class="pdf-modal-filename">${fileName}</div>
            <div id="downloadNotice" style="font-size:12px;color:#005952;font-weight:600;min-height:16px;margin:2px 0 8px 0;"></div>

            <!-- PRIMARY ACTIONS: Explicit Download and Share -->
            <div class="pdf-modal-actions">
                <button type="button" class="pdf-modal-btn pdf-btn-share" id="btnModalDownload">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Download PDF</span>
                </button>

                <button type="button" class="pdf-modal-btn pdf-btn-primary" id="btnModalShare">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    <span>Share Document</span>
                </button>

                ${googleViewerUrl ? `
                <button type="button" class="pdf-modal-btn pdf-btn-viewer" id="btnModalGoogleViewer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span>View Document</span>
                </button>
                ` : ''}

                <button type="button" class="pdf-modal-btn pdf-btn-close" id="btnModalClose">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span>Close</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);

    // Download PDF Handler
    const dlBtn = document.getElementById('btnModalDownload');
    if (dlBtn) {
        dlBtn.addEventListener('click', () => {
            try {
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 5000);

                const notice = document.getElementById('downloadNotice');
                if (notice) {
                    notice.textContent = 'Your download will start shortly...';
                    setTimeout(() => { if (notice) notice.textContent = ''; }, 3000);
                }
            } catch (e) {
                console.warn('Download handler error:', e);
            }
        });
    }

    // Share Document Handler: tries Web Share API first, or slides up native-style share sheet
    const sysShareBtn = document.getElementById('btnModalShare');
    if (sysShareBtn) {
        sysShareBtn.addEventListener('click', async () => {
            // Dismiss the success popup so it is never displayed over/in front of the share options
            backdrop.remove();

            if (navigator.share) {
                try {
                    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: shareTitle,
                            text: shareText
                        });
                        return;
                    } else {
                        await navigator.share({
                            title: shareTitle,
                            text: shareText,
                            url: targetDocUrl || window.location.href
                        });
                        return;
                    }
                } catch (err) {
                    if (err.name === 'AbortError') return;
                    console.warn('Native share error, falling back to sheet:', err);
                }
            }

            // In WebView (or browsers where navigator.share is unavailable), open native-style share sheet
            openShareBottomSheet(shareTitle, shareText, targetDocUrl);
        });
    }

    // Google Viewer button handler (View Document)
    const gvBtn = document.getElementById('btnModalGoogleViewer');
    if (gvBtn && googleViewerUrl) {
        gvBtn.addEventListener('click', () => {
            window.location.href = googleViewerUrl;
        });
    }

    // Close button handler
    const closeBtn = document.getElementById('btnModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => backdrop.remove());
    }
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.remove();
    });
}

function openShareBottomSheet(shareTitle, shareText, shareUrl) {
    const existing = document.getElementById('shareBottomSheet');
    if (existing) existing.remove();

    const targetUrl = shareUrl || window.location.href;
    const fullText = `${shareTitle}:\n${targetUrl}`;

    const sheet = document.createElement('div');
    sheet.id = 'shareBottomSheet';
    sheet.className = 'share-sheet-backdrop';
    sheet.innerHTML = `
        <div class="share-sheet-card">
            <div class="share-sheet-handle"></div>
            <div class="share-sheet-title">Share Document</div>
            
            <div class="share-sheet-grid">
                <!-- WhatsApp -->
                <button type="button" class="share-sheet-item" id="sheetShareWa">
                    <div class="share-sheet-icon icon-wa">💬</div>
                    <span class="share-sheet-label">WhatsApp</span>
                </button>

                <!-- Email -->
                <button type="button" class="share-sheet-item" id="sheetShareEmail">
                    <div class="share-sheet-icon icon-mail">✉️</div>
                    <span class="share-sheet-label">Email</span>
                </button>

                <!-- SMS -->
                <button type="button" class="share-sheet-item" id="sheetShareSms">
                    <div class="share-sheet-icon icon-sms">📱</div>
                    <span class="share-sheet-label">Messages</span>
                </button>

                <!-- Copy Link -->
                <button type="button" class="share-sheet-item" id="sheetShareCopy">
                    <div class="share-sheet-icon icon-copy">📋</div>
                    <span class="share-sheet-label" id="sheetCopyLabel">Copy Link</span>
                </button>
            </div>

            <button type="button" class="share-sheet-cancel" id="sheetShareCancel">Cancel</button>
        </div>
    `;

    document.body.appendChild(sheet);

    // WhatsApp handler
    document.getElementById('sheetShareWa').addEventListener('click', () => {
        window.location.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
    });

    // Email handler
    document.getElementById('sheetShareEmail').addEventListener('click', () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(fullText)}`;
    });

    // SMS handler
    document.getElementById('sheetShareSms').addEventListener('click', () => {
        window.location.href = `sms:?body=${encodeURIComponent(fullText)}`;
    });

    // Copy Link handler
    document.getElementById('sheetShareCopy').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(targetUrl);
            const lbl = document.getElementById('sheetCopyLabel');
            if (lbl) lbl.textContent = 'Copied!';
            setTimeout(() => { sheet.remove(); }, 1200);
        } catch (e) {
            prompt('Document link:', targetUrl);
        }
    });

    // Cancel handler
    document.getElementById('sheetShareCancel').addEventListener('click', () => sheet.remove());
    sheet.addEventListener('click', (e) => {
        if (e.target === sheet) sheet.remove();
    });
}

// Global responsive helper for multi-column tables on mobile
(function() {
    function makeTablesResponsive() {
        document.querySelectorAll('.doc-table').forEach(tbl => {
            if (tbl.closest('.table-responsive')) return;
            const firstRowCells = tbl.querySelectorAll('tr:first-child > th, tr:first-child > td');
            const cellCount = firstRowCells.length;
            const hasRadios = tbl.querySelector('input[type="radio"], input[type="checkbox"]');
            // If table has > 2 columns or has radios/checkboxes, wrap in table-responsive container
            if (cellCount > 2 || hasRadios) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-responsive';
                tbl.parentNode.insertBefore(wrapper, tbl);
                wrapper.appendChild(tbl);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', makeTablesResponsive);
    } else {
        makeTablesResponsive();
    }
    setTimeout(makeTablesResponsive, 200);
})();

