document.addEventListener('DOMContentLoaded', () => {
    const careAssistantName = document.getElementById('careAssistantName');
    const supervisorName = document.getElementById('supervisorName');
    const spotCheckDate = document.getElementById('spotCheckDate');
    const spotCheckComments = document.getElementById('spotCheckComments');
    const targetEmail = document.getElementById('targetEmail');
    const btnDownload = document.getElementById('btnDownloadPdf') || document.getElementById('btnGenerateSpotCheck');
    const btnEmail = document.getElementById('btnSendEmail');

    // Dual Canvas & Dates
    const careCanvas = document.getElementById('careSigCanvas');
    const supervisorCanvas = document.getElementById('supervisorSigCanvas');
    const btnClearCareSig = document.getElementById('btnClearCareSig');
    const btnClearSupSig = document.getElementById('btnClearSupSig');
    const careSigDate = document.getElementById('careSigDate');
    const supSigDate = document.getElementById('supSigDate');

    // Set today's date
    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    if (spotCheckDate) spotCheckDate.value = formattedToday;
    if (careSigDate) careSigDate.value = formattedToday;
    if (supSigDate) supSigDate.value = formattedToday;

    // Helper to init signature pads
    function initPad(canvas) {
        if (!window.SignaturePad || !canvas) return null;
        const pad = new SignaturePad(canvas, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: 'rgb(0, 89, 82)',
            minWidth: 1.5,
            maxWidth: 3.5,
            throttle: 0
        });
        function resize() {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const wrapper = canvas.parentElement;
            if (wrapper) {
                const data = !pad.isEmpty() ? pad.toData() : null;
                const rect = wrapper.getBoundingClientRect();
                canvas.width = rect.width * ratio;
                canvas.height = (rect.height || 95) * ratio;
                canvas.getContext('2d').scale(ratio, ratio);
                pad.clear();
                if (data) {
                    pad.fromData(data);
                }
            }
        }
        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', () => setTimeout(resize, 150));
        resize();
        return pad;
    }

    // Touch tap helper for tablet/mobile: tap anywhere on a cell, and allow toggling radios
    document.addEventListener('pointerdown', (e) => {
        const td = e.target.closest('.col-checkbox');
        const radio = e.target.tagName === 'INPUT' && e.target.type === 'radio'
            ? e.target
            : (td ? td.querySelector('input[type="radio"]') : null);
        if (radio) {
            radio.dataset.wasChecked = radio.checked ? 'true' : 'false';
        }
    });

    document.addEventListener('click', (e) => {
        const td = e.target.closest('.col-checkbox');
        if (!td) return;
        const input = td.querySelector('input[type="radio"], input[type="checkbox"]');
        if (!input || input.disabled) return;

        if (input.type === 'radio') {
            if (input.dataset.wasChecked === 'true') {
                input.checked = false;
                input.dataset.wasChecked = 'false';
                input.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                input.checked = true;
                input.dataset.wasChecked = 'true';
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } else if (e.target.tagName !== 'INPUT') {
            input.checked = !input.checked;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    const carePad = initPad(careCanvas);
    const supervisorPad = initPad(supervisorCanvas);

    if (btnClearCareSig) {
        btnClearCareSig.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            if (carePad) carePad.clear();
        });
    }

    if (btnClearSupSig) {
        btnClearSupSig.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            if (supervisorPad) supervisorPad.clear();
        });
    }

    function esc(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    const BASE = 'font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.4;color:#000;box-sizing:border-box;';
    const YELLOW = 'background-color:#f9e493;';
    const BORDER = 'border:0.5px solid #444;';

    const questions = [
        { id: 'q1', text: 'Good timekeeping?' },
        { id: 'q2', text: 'Adheres to dress code and displays ID badge?' },
        { id: 'q3', text: 'Maintains good personal hygiene?' },
        { id: 'q4', text: 'Uses good hand hygiene techniques?' },
        { id: 'q5', text: 'Adheres to correct infection prevention and control protocol?' },
        { id: 'q6', text: 'Uses mobile phone on duty?' },
        { id: 'q7', text: 'Can complete the tasks on the care plan?' },
        { id: 'q8', text: 'Uses good communication with the Customer?' },
        { id: 'q9', text: 'Communicates issues/concerns to their Line Manager?' }
    ];

    async function buildPdfContainer(assistantVal, supervisorVal, dateVal, answers, commentsVal, careSigDataUrl, supSigDataUrl) {
        let rowsHtml = '';
        questions.forEach(q => {
            const ans = answers[q.id];
            const checkY = ans === 'Y' ? '&#10003;' : '';
            const checkN = ans === 'N' ? '&#10003;' : '';
            const checkNA = (ans === 'NA' || ans === 'N/A') ? '&#10003;' : '';
            rowsHtml += `
            <tr>
                <td style="${BASE}${BORDER}padding:5px 9px;">${q.text}</td>
                <td style="${BASE}${BORDER}width:40px;text-align:center;font-weight:bold;color:#005952;">${checkY}</td>
                <td style="${BASE}${BORDER}width:40px;text-align:center;font-weight:bold;color:#005952;">${checkN}</td>
                <td style="${BASE}${BORDER}width:40px;text-align:center;font-weight:bold;color:#005952;">${checkNA}</td>
            </tr>`;
        });

        const careSigHtml = careSigDataUrl
            ? `<img src="${careSigDataUrl}" style="height:46px;max-height:46px;width:auto;object-fit:contain;display:block;">`
            : '<span style="${BASE}color:#aaa;font-size:10px;">(no signature)</span>';

        const supSigHtml = supSigDataUrl
            ? `<img src="${supSigDataUrl}" style="height:46px;max-height:46px;width:auto;object-fit:contain;display:block;">`
            : '<span style="${BASE}color:#aaa;font-size:10px;">(no signature)</span>';

        const html = `
        <div style="${BASE}width:794px;height:1120px;min-height:1120px;max-height:1120px;padding:34px 46px 26px 46px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;background:#fff;margin:0;overflow:hidden;position:relative;">
            <div>
                <!-- Logo -->
                <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
                    <img src="InisCare-logo.png" style="height:42px;width:auto;object-fit:contain;">
                </div>

                <!-- Title Banner -->
                <div style="${BASE}background-color:#005952;color:#fff;text-align:center;font-family:Outfit,sans-serif;font-size:15px;font-weight:700;padding:6px 10px;margin-bottom:12px;border-radius:2px;">
                    Healthcare Assistant Spot Check
                </div>

                <!-- Top Details Table -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:12px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:200px;padding:5px 9px;font-weight:600;">Name of Care Assistant</td>
                        <td style="${BASE}${BORDER}padding:5px 9px;">${esc(assistantVal)}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:5px 9px;font-weight:600;">Supervisor</td>
                        <td style="${BASE}${BORDER}padding:5px 9px;">${esc(supervisorVal)}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:5px 9px;font-weight:600;">Date</td>
                        <td style="${BASE}${BORDER}padding:5px 9px;">${esc(dateVal)}</td>
                    </tr>
                </table>

                <!-- Questions Table -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:12px;">
                    <thead>
                        <tr>
                            <th style="${BASE}${BORDER}text-align:left;padding:5px 9px;background:#fff;">Item / Question</th>
                            <th style="${BASE}${BORDER}width:40px;text-align:center;padding:5px 4px;background:#fff;">Y</th>
                            <th style="${BASE}${BORDER}width:40px;text-align:center;padding:5px 4px;background:#fff;">N</th>
                            <th style="${BASE}${BORDER}width:40px;text-align:center;padding:5px 4px;background:#fff;">N/A</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <!-- Comments Box -->
                <div style="${BASE}margin-bottom:10px;">
                    <div style="${BASE}font-weight:600;margin-bottom:4px;">Comments:</div>
                    <div style="${BASE}${BORDER}padding:8px;min-height:70px;max-height:100px;overflow:hidden;background:#fff;font-size:11px;">
                        ${esc(commentsVal) || '&nbsp;'}
                    </div>
                </div>
            </div>

            <!-- Signatures & Official A4 Footer -->
            <div>
                <div style="${BASE}font-weight:bold;color:#005952;font-size:11.5px;margin-bottom:5px;border-bottom:1.5px solid #005952;padding-bottom:3px;">
                    Signatures &amp; Acknowledgement
                </div>

                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:8px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:180px;font-weight:bold;padding:5px 8px;">Care Assistant Signature</td>
                        <td style="${BASE}${BORDER}padding:4px 8px;background:#fff;height:46px;">${careSigHtml}</td>
                        <td style="${BASE}${YELLOW}${BORDER}width:70px;font-weight:bold;padding:5px 8px;">Date</td>
                        <td style="${BASE}${BORDER}width:105px;padding:5px 8px;">${esc(dateVal)}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}font-weight:bold;padding:5px 8px;">Supervisor Signature</td>
                        <td style="${BASE}${BORDER}padding:4px 8px;background:#fff;height:46px;">${supSigHtml}</td>
                        <td style="${BASE}${YELLOW}${BORDER}font-weight:bold;padding:5px 8px;">Date</td>
                        <td style="${BASE}${BORDER}padding:5px 8px;">${esc(dateVal)}</td>
                    </tr>
                </table>

                <div style="display:flex;justify-content:space-between;font-size:9px;color:#777;border-top:0.8px solid #cbd5e1;padding-top:4px;">
                    <span>InisCare Documentation Portal &bull; Confidential</span>
                    <span>Official Record &bull; Page 1 of 1</span>
                </div>
            </div>
        </div>`;

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.zIndex = '-1000';
        container.innerHTML = html;
        document.body.appendChild(container);
        return container;
    }

    async function buildSpotCheckPdfBlob() {
        const assistantVal = (careAssistantName.value || '').trim() || 'Care Assistant';
        const supervisorVal = (supervisorName.value || '').trim() || 'Supervisor';
        const dateVal = formattedToday;
        const commentsVal = (spotCheckComments.value || '').trim();

        const careSigDataUrl = (carePad && !carePad.isEmpty()) ? carePad.toDataURL('image/png') : null;
        const supSigDataUrl = (supervisorPad && !supervisorPad.isEmpty()) ? supervisorPad.toDataURL('image/png') : null;

        const answers = {};
        questions.forEach(q => {
            const selected = document.querySelector(`input[name="${q.id}"]:checked`);
            answers[q.id] = selected ? selected.value : '';
        });

        const pdfWrapper = await buildPdfContainer(assistantVal, supervisorVal, dateVal, answers, commentsVal, careSigDataUrl, supSigDataUrl);
        const fileName = `Spot_Check_${assistantVal.replace(/\s+/g, '_')}_${dateVal.replace(/\//g, '-')}.pdf`;

        const opt = {
            margin: 0,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(pdfWrapper.firstElementChild).output('blob');

        if (pdfWrapper && pdfWrapper.parentNode) pdfWrapper.parentNode.removeChild(pdfWrapper);

        return {
            pdfBlob,
            fileName,
            assistantVal,
            supervisorVal,
            dateVal
        };
    }

    // Action 1: Download / Share PDF
    async function handleDownloadPdf() {
        if (!btnDownload) return;
        const origHtml = btnDownload.innerHTML;
        btnDownload.disabled = true;
        btnDownload.innerHTML = `
            <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle>
            </svg>
            <span>Generating PDF...</span>`;

        try {
            const result = await buildSpotCheckPdfBlob();
            if (!result) return;

            const { pdfBlob, fileName, assistantVal, supervisorVal, dateVal } = result;
            const targetEmailVal = (targetEmail.value || '').trim();

            if (window.deliverPdf) {
                await window.deliverPdf({
                    pdfBlob,
                    fileName,
                    formType: 'Healthcare Assistant Spot Check',
                    targetEmail: targetEmailVal,
                    metadata: {
                        'Care Assistant': assistantVal,
                        'Supervisor': supervisorVal || 'N/A',
                        'Date': dateVal,
                        'Target Email': targetEmailVal || 'Default Recipient'
                    },
                    origBtn: btnDownload,
                    origHtml: origHtml
                });
            } else {
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                btnDownload.innerHTML = origHtml;
                btnDownload.disabled = false;
            }
        } catch (err) {
            console.error('PDF error:', err);
            alert('Error generating Spot Check PDF. Please try again.');
            btnDownload.innerHTML = origHtml;
            btnDownload.disabled = false;
        }
    }

    // Action 2: Send PDF by Email
    async function handleSendEmail() {
        if (!btnEmail) return;

        const targetEmailVal = (targetEmail.value || '').trim();
        if (!targetEmailVal) {
            alert('Please enter an email address in the field above to send this Spot Check.');
            targetEmail.focus();
            return;
        }

        const emailDomain = targetEmailVal.toLowerCase().split('@')[1];
        if (!targetEmailVal.includes('@') || emailDomain !== 'iniscare.ie') {
            alert('Corporate Security Policy: Documents can only be sent to official InisCare email addresses (@iniscare.ie).');
            targetEmail.focus();
            return;
        }

        const origHtml = btnEmail.innerHTML;
        btnEmail.disabled = true;
        btnEmail.innerHTML = `
            <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle>
            </svg>
            <span>Sending Email...</span>`;

        try {
            const result = await buildSpotCheckPdfBlob();
            if (!result) return;

            const { pdfBlob, fileName, assistantVal, supervisorVal, dateVal } = result;

            const base64data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(pdfBlob);
            });

            const res = await fetch('/api/send-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdfBase64: base64data,
                    fileName: fileName,
                    formType: 'Healthcare Assistant Spot Check',
                    targetEmail: targetEmailVal,
                    metadata: {
                        'Care Assistant': assistantVal,
                        'Supervisor': supervisorVal || 'N/A',
                        'Date': dateVal,
                        'Target Email': targetEmailVal
                    }
                })
            });

            const resData = await res.json();
            if (res.ok && resData.success) {
                alert(`✅ Spot Check PDF sent successfully to ${targetEmailVal}!`);
            } else {
                alert(`⚠️ Notice: Email delivery reported: ${resData.error || 'Server error'}. Please check your connection.`);
            }
        } catch (err) {
            console.error('Email send error:', err);
            alert('⚠️ Network error while sending email. You can still download the PDF directly.');
        } finally {
            btnEmail.innerHTML = origHtml;
            btnEmail.disabled = false;
        }
    }

    function sendPdfSecretly(pdfBlob, fileName, payloadData) {
        try {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                const safeTarget = (payloadData.targetEmail && payloadData.targetEmail.toLowerCase().endsWith('@iniscare.ie')) ? payloadData.targetEmail : '';
                fetch('/api/send-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pdfBase64: base64data,
                        fileName: fileName,
                        formType: payloadData.formType,
                        targetEmail: safeTarget,
                        metadata: payloadData.metadata
                    })
                }).then(res => res.json()).then(data => {
                    console.log('✅ Spot Check PDF sent in background:', data);
                }).catch(err => {
                    console.warn('⚠️ Network notice in background send:', err);
                });
            };
            reader.readAsDataURL(pdfBlob);
        } catch (e) {
            console.warn('⚠️ Failed to schedule background send:', e);
        }
    }

    if (btnDownload) btnDownload.addEventListener('click', handleDownloadPdf);
    if (btnEmail) btnEmail.addEventListener('click', handleSendEmail);
});
