document.addEventListener('DOMContentLoaded', () => {
    const carerName = document.getElementById('carerName');
    const completedBy = document.getElementById('completedBy');
    const q1Answer = document.getElementById('q1_answer');
    const targetEmail = document.getElementById('targetEmail');
    const btnDownload = document.getElementById('btnDownloadPdf') || document.getElementById('btnGenerateCatchUp');
    const btnEmail = document.getElementById('btnSendEmail');

    const carerSigCanvas = document.getElementById('carerSigCanvas');
    const supervisorSigCanvas = document.getElementById('supervisorSigCanvas');
    const btnClearCarerSig = document.getElementById('btnClearCarerSig');
    const btnClearSupervisorSig = document.getElementById('btnClearSupervisorSig');
    const carerSigDate = document.getElementById('carerSigDate');
    const supervisorSigDate = document.getElementById('supervisorSigDate');

    // Date formatting DD/MM/YYYY
    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    if (q1Answer && !q1Answer.value) q1Answer.value = formattedToday;
    if (carerSigDate) carerSigDate.value = formattedToday;
    if (supervisorSigDate) supervisorSigDate.value = formattedToday;

    // 8 Questions list (Conversational Catch Up Assessment)
    const questionsMeta = [
        { id: 'q1', num: '1 of 8', title: 'Date Of Assessment', isDate: true },
        { id: 'q3', num: '2 of 8', title: 'Do you like working with InisCare?', isDate: false },
        { id: 'q4', num: '3 of 8', title: 'How is the communication with your Line Manager?', isDate: false },
        { id: 'q5', num: '4 of 8', title: 'Do you receive enough support on a daily basis?', isDate: false },
        { id: 'q6', num: '5 of 8', title: 'Do you receive sufficient feedback of your performance from the Managers/Supervisors?', isDate: false },
        { id: 'q7', num: '6 of 8', title: 'Are you happy with your working hours?', isDate: false },
        { id: 'q8', num: '7 of 8', title: 'Do you have any suggestions or ideas on how we could improve the Care Assistant experience?', isDate: false },
        { id: 'q9', num: '8 of 8', title: 'Any additional comments or concerns?', isDate: false }
    ];

    // Initialize Signature Pads
    let carerPad = null;
    let supervisorPad = null;

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

    carerPad = initPad(carerSigCanvas);
    supervisorPad = initPad(supervisorSigCanvas);

    if (btnClearCarerSig) {
        btnClearCarerSig.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            if (carerPad) carerPad.clear();
        });
    }

    if (btnClearSupervisorSig) {
        btnClearSupervisorSig.addEventListener('click', (e) => {
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

    const BASE = 'font-family:Inter,Arial,sans-serif;font-size:11px;line-height:1.4;color:#000;box-sizing:border-box;';
    const YELLOW = 'background-color:#f9e493;';
    const BORDER = 'border:0.5px solid #444;';

    // Build question block HTML for PDF (Compact 1-Page Layout)
    function buildQuestionRow(q, answerText) {
        return `
        <div style="margin-bottom:5px;border:0.5px solid #444;border-radius:2px;overflow:hidden;">
            <div style="${BASE}${YELLOW}padding:2px 6px;border-bottom:0.5px solid #444;">
                <span style="font-weight:700;font-size:9px;color:#000;">${q.title}</span>
            </div>
            <div style="${BASE}padding:3px 6px;background:#fff;min-height:16px;max-height:50px;overflow:hidden;white-space:pre-wrap;color:#222;font-size:8.5px;line-height:1.25;">
                ${esc(answerText) || '<em style="color:#888;">(No answer provided)</em>'}
            </div>
        </div>`;
    }

    // Build the Single-page A4 PDF container
    async function buildPdfContainer(carerVal, completedByVal, answersMap, carerSigUrl, supervisorSigUrl, carerDateVal, supDateVal) {
        const carerSigHtml = carerSigUrl
            ? `<img src="${carerSigUrl}" style="height:34px;max-height:34px;width:auto;object-fit:contain;display:block;">`
            : `<span style="${BASE}color:#aaa;font-size:9px;">(no signature)</span>`;

        const supervisorSigHtml = supervisorSigUrl
            ? `<img src="${supervisorSigUrl}" style="height:34px;max-height:34px;width:auto;object-fit:contain;display:block;">`
            : `<span style="${BASE}color:#aaa;font-size:9px;">(no signature)</span>`;

        // Render questions (q1 is already displayed in top metadata table)
        let questionsHtml = '';
        questionsMeta.forEach(q => {
            if (q.id === 'q1') return;
            const ans = answersMap[q.id]?.answer || '';
            questionsHtml += buildQuestionRow(q, ans);
        });

        // 794px x 1120px = Strict A4 Portrait (Single Page Guaranteed)
        const html = `
        <div style="${BASE}width:794px;height:1120px;min-height:1120px;max-height:1120px;padding:22px 34px 16px 34px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;background:#fff;margin:0;overflow:hidden;position:relative;">
            <div>
                <!-- Logo -->
                <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
                    <img src="InisCare-logo.png" style="height:34px;width:auto;object-fit:contain;">
                </div>

                <!-- Title Banner -->
                <div style="${BASE}background-color:#005952;color:#fff;text-align:center;font-family:Outfit,sans-serif;font-size:13.5px;font-weight:700;padding:4px 8px;margin-bottom:7px;border-radius:2px;">
                    Care Assistant Catch Up
                </div>

                <!-- Top Details Table (2x2 grid) -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:7px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:145px;font-weight:600;padding:3px 6px;font-size:9.5px;">Carer</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9.5px;">${esc(carerVal)}</td>
                        <td style="${BASE}${YELLOW}${BORDER}width:145px;font-weight:600;padding:3px 6px;font-size:9.5px;">Completed By</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9.5px;">${esc(completedByVal)}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:600;font-size:9.5px;">Date of Assessment</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:3px 6px;font-size:9.5px;">${esc(answersMap['q1']?.answer || formattedToday)}</td>
                    </tr>
                </table>

                <!-- All 7 Evaluation Questions -->
                ${questionsHtml}
            </div>

            <!-- Signatures & Official A4 Footer -->
            <div>
                <div style="${BASE}font-weight:bold;color:#005952;font-size:10px;margin-top:4px;margin-bottom:3px;border-bottom:1px solid #005952;padding-bottom:1px;">
                    Signatures &amp; Acknowledgement
                </div>

                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:140px;font-weight:bold;padding:3px 6px;font-size:9px;">Care Assistant Signature</td>
                        <td style="${BASE}${BORDER}padding:2px 6px;background:#fff;height:36px;">${carerSigHtml}</td>
                        <td style="${BASE}${YELLOW}${BORDER}width:130px;font-weight:bold;padding:3px 6px;font-size:9px;">Supervisor Signature</td>
                        <td style="${BASE}${BORDER}padding:2px 6px;background:#fff;height:36px;">${supervisorSigHtml}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2px 6px;font-size:9px;font-weight:bold;">Date</td>
                        <td style="${BASE}${BORDER}padding:2px 6px;font-size:9px;">${esc(carerDateVal || formattedToday)}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2px 6px;font-size:9px;font-weight:bold;">Date</td>
                        <td style="${BASE}${BORDER}padding:2px 6px;font-size:9px;">${esc(supDateVal || formattedToday)}</td>
                    </tr>
                </table>

                <div style="display:flex;justify-content:space-between;font-size:8.5px;color:#777;border-top:0.5px solid #ccc;padding-top:3px;">
                    <span>InisCare Catch Up Assessment &bull; Confidential</span>
                    <span>Official Record &bull; Page 1 of 1</span>
                </div>
            </div>
        </div>`;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:794px;overflow:hidden;pointer-events:none;opacity:0;';
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        const imgs = wrapper.querySelectorAll('img');
        await Promise.all(Array.from(imgs).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(res => { img.onload = res; img.onerror = res; });
        }));

        return wrapper;
    }

    // Build PDF Blob and Data
    async function buildCatchUpPdfBlob() {
        const carerVal = (carerName && carerName.value.trim()) || 'Carer';
        const completedByVal = (completedBy && completedBy.value.trim()) || 'Supervisor';
        const targetEmailVal = (targetEmail && targetEmail.value.trim()) || '';

        // Collect answers
        const answersMap = {};
        questionsMeta.forEach(q => {
            const ansElem = document.getElementById(`${q.id}_answer`);
            answersMap[q.id] = {
                title: q.title,
                num: q.num,
                answer: ansElem ? ansElem.value.trim() : ''
            };
        });

        // Signatures
        let carerSigDataUrl = '';
        if (carerPad && !carerPad.isEmpty()) {
            carerSigDataUrl = carerPad.toDataURL('image/png');
        }

        let supervisorSigDataUrl = '';
        if (supervisorPad && !supervisorPad.isEmpty()) {
            supervisorSigDataUrl = supervisorPad.toDataURL('image/png');
        }

        // Build offscreen container for html2pdf
        const pdfWrapper = await buildPdfContainer(
            carerVal,
            completedByVal,
            answersMap,
            carerSigDataUrl,
            supervisorSigDataUrl,
            (carerSigDate && carerSigDate.value) || formattedToday,
            (supervisorSigDate && supervisorSigDate.value) || formattedToday
        );

        const safeDateStr = formattedToday.replace(/\//g, '-');
        const safeCarerName = carerVal.replace(/\s+/g, '_');
        const fileName = `InisCare_Catch_Up_${safeCarerName}_${safeDateStr}.pdf`;

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
            carerVal,
            completedByVal,
            answersMap,
            targetEmailVal
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
            const result = await buildCatchUpPdfBlob();
            if (!result) return;

            const { pdfBlob, fileName, carerVal, completedByVal, answersMap, targetEmailVal } = result;

            if (window.deliverPdf) {
                await window.deliverPdf({
                    pdfBlob,
                    fileName,
                    formType: 'Care Assistant Catch Up',
                    targetEmail: targetEmailVal,
                    metadata: {
                        'Carer': carerVal,
                        'Completed By': completedByVal,
                        'Date Of Assessment': answersMap['q1']?.answer || formattedToday,
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
            console.error('PDF generation error:', err);
            alert('Error generating Catch Up PDF. Please try again.');
        } finally {
            btnDownload.innerHTML = origHtml;
            btnDownload.disabled = false;
        }
    }

    // Action 2: Send PDF by Email
    async function handleSendEmail() {
        if (!btnEmail) return;

        const targetEmailVal = (targetEmail && targetEmail.value.trim()) || '';
        if (!targetEmailVal) {
            alert('Please enter an email address in the field above to send this Catch Up assessment.');
            if (targetEmail) targetEmail.focus();
            return;
        }

        const emailDomain = targetEmailVal.toLowerCase().split('@')[1];
        if (!targetEmailVal.includes('@') || emailDomain !== 'iniscare.ie') {
            alert('Corporate Security Policy: Documents can only be sent to official InisCare email addresses (@iniscare.ie).');
            if (targetEmail) targetEmail.focus();
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
            const result = await buildCatchUpPdfBlob();
            if (!result) return;

            const { pdfBlob, fileName, carerVal, completedByVal, answersMap } = result;

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
                    formType: 'Care Assistant Catch Up',
                    targetEmail: targetEmailVal,
                    metadata: {
                        'Carer': carerVal,
                        'Completed By': completedByVal,
                        'Date Of Assessment': answersMap['q1']?.answer || formattedToday,
                        'Target Email': targetEmailVal
                    }
                })
            });

            const resData = await res.json();
            if (res.ok && resData.success) {
                alert(`✅ Catch Up PDF sent successfully to ${targetEmailVal}!`);
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

    // Silent background email dispatch
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
                    console.log('✅ Catch Up PDF sent in background:', data);
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
