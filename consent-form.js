document.addEventListener('DOMContentLoaded', () => {
    const inputName = document.getElementById('inputName');
    const inputAddress = document.getElementById('inputAddress');
    const inputPhone = document.getElementById('inputPhone');
    const inputConsent = document.getElementById('inputConsent');
    const inputComments = document.getElementById('inputComments');
    const inputDate = document.getElementById('inputDate');
    const targetEmail = document.getElementById('targetEmail');
    const btnClearConsentSig = document.getElementById('btnClearConsentSig');
    const btnDownload = document.getElementById('btnDownloadPdf') || document.getElementById('btnGenerateConsent');
    const btnEmail = document.getElementById('btnSendEmail');
    const canvas = document.getElementById('consentSigCanvas');

    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    if (inputDate) inputDate.value = formattedToday;

    let signaturePad = null;
    if (window.SignaturePad && canvas) {
        signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: 'rgb(0, 89, 82)',
            minWidth: 1.5,
            maxWidth: 3.5,
            throttle: 0
        });

        function resizeCanvas() {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const wrapper = canvas.parentElement;
            if (wrapper) {
                const data = !signaturePad.isEmpty() ? signaturePad.toData() : null;
                const rect = wrapper.getBoundingClientRect();
                canvas.width = rect.width * ratio;
                canvas.height = (rect.height || 95) * ratio;
                canvas.getContext('2d').scale(ratio, ratio);
                signaturePad.clear();
                if (data) {
                    signaturePad.fromData(data);
                }
            }
        }
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 150));
        resizeCanvas();
    }

    if (btnClearConsentSig && signaturePad) {
        btnClearConsentSig.addEventListener('click', (e) => {
            e.preventDefault();
            signaturePad.clear();
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
    const BORDER = 'border:1.2px solid #000;';

    async function buildPdfContainer(nameVal, addressVal, phoneVal, consentChecked, commentsVal, sigDataUrl) {
        const checkMark = consentChecked ? '&#10003;' : '';

        const sigHtml = sigDataUrl
            ? `<img src="${sigDataUrl}" style="height:65px;max-height:65px;width:auto;object-fit:contain;display:block;">`
            : '<span style="${BASE}color:#aaa;">(no signature)</span>';

        const html = `
        <div style="${BASE}width:794px;height:1120px;min-height:1120px;max-height:1120px;padding:48px 56px 36px 56px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;background:#fff;margin:0;position:relative;">

            <div>
                <!-- Logo -->
                <div style="display:flex;justify-content:flex-end;margin-bottom:18px;">
                    <img src="InisCare-logo.png" style="height:50px;width:auto;object-fit:contain;">
                </div>

                <!-- Title -->
                <h1 style="font-family:Outfit,Georgia,sans-serif;font-size:22px;font-weight:700;color:#0d706a;text-align:center;margin:0 0 22px 0;padding:0;letter-spacing:0.3px;">Staff Phone &amp; WhatsApp Consent Form</h1>

                <!-- Table 1 (Details) -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:20px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}border-right:1.2px solid #000;width:150px;padding:8px 12px;font-weight:600;font-size:12px;vertical-align:middle;">Name:</td>
                        <td style="${BASE}${BORDER}border-left:none;padding:8px 12px;font-size:12px;vertical-align:middle;">${esc(nameVal)}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}border-right:1.2px solid #000;border-top:1.2px solid #000;width:150px;padding:8px 12px;font-weight:600;font-size:12px;vertical-align:middle;">Address:</td>
                        <td style="${BASE}${BORDER}border-left:none;border-top:1.2px solid #000;padding:8px 12px;font-size:12px;vertical-align:middle;">${esc(addressVal)}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}border-right:1.2px solid #000;border-top:1.2px solid #000;width:150px;padding:8px 12px;font-weight:600;font-size:12px;vertical-align:middle;">Phone Number:</td>
                        <td style="${BASE}${BORDER}border-left:none;border-top:1.2px solid #000;padding:8px 12px;font-size:12px;vertical-align:middle;">${esc(phoneVal)}</td>
                    </tr>
                </table>

                <!-- Consent Statement Box -->
                <div style="${BASE}${BORDER}background:#f8fafc;padding:16px 20px;border-radius:4px;display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px;">
                    <span style="${BASE}flex:1;font-size:11.5px;line-height:1.55;color:#1e293b;">${esc('I am giving my consent for InisCare staff to store my phone number and include me in the staff WhatsApp communication group.')}</span>
                    <span style="${BASE}width:22px;height:22px;border:2px solid #005952;background:${consentChecked ? '#005952' : '#fff'};color:#fff;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:15px;font-weight:bold;border-radius:3px;">${checkMark}</span>
                </div>

                <!-- Additional Comments -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:20px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}border-bottom:1.2px solid #000;padding:8px 12px;font-weight:600;font-size:12px;">Additional Comments / Notes:</td>
                    </tr>
                    <tr>
                        <td style="${BASE}padding:12px 14px;min-height:90px;height:90px;vertical-align:top;font-size:11.5px;line-height:1.5;">${esc(commentsVal) || '<span style="color:#94a3b8;font-style:italic;">No additional comments recorded.</span>'}</td>
                    </tr>
                </table>
            </div>

            <!-- Signature & Official A4 Footer -->
            <div>
                <div style="${BASE}display:flex;justify-content:space-between;align-items:flex-end;border-top:1.5px solid #005952;padding-top:16px;margin-bottom:16px;">
                    <div style="${BASE}flex:1;padding-right:20px;">
                        <div style="${BASE}font-weight:700;color:#005952;font-size:11.5px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Staff Digital Signature:</div>
                        <div style="height:70px;display:flex;align-items:center;">${sigHtml}</div>
                    </div>
                    <div style="${BASE}width:180px;text-align:right;">
                        <div style="${BASE}font-weight:700;color:#005952;font-size:11.5px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Date of Sign-off:</div>
                        <div style="${BASE}font-size:12.5px;font-weight:600;color:#1e293b;padding-bottom:10px;">${esc(formattedToday)}</div>
                    </div>
                </div>

                <!-- A4 Page Footer -->
                <div style="display:flex;justify-content:space-between;font-size:9px;color:#64748b;border-top:0.8px solid #cbd5e1;padding-top:6px;">
                    <span>InisCare Ltd &bull; Staff Consent Documentation &bull; Confidential</span>
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

        await new Promise(res => setTimeout(res, 80));
        return wrapper;
    }

    async function buildConsentPdfBlob() {
        const nameVal = (inputName.value || '').trim();
        const namePart = nameVal ? nameVal.replace(/\s+/g, '_') : 'Blank_Draft';

        const addressVal = (inputAddress.value || '').trim();
        const phoneVal = (inputPhone.value || '').trim();
        const consentChecked = inputConsent.checked;
        const commentsVal = (inputComments.value || '').trim();
        const targetEmailVal = (targetEmail.value || '').trim();
        const sigDataUrl = (signaturePad && !signaturePad.isEmpty()) ? signaturePad.toDataURL('image/png') : null;

        const pdfWrapper = await buildPdfContainer(nameVal, addressVal, phoneVal, consentChecked, commentsVal, sigDataUrl);
        const fileName = `InisCare_Consent_Form_${namePart}.pdf`;

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
            data: {
                nameVal,
                addressVal,
                phoneVal,
                consentChecked,
                targetEmailVal
            }
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
            const result = await buildConsentPdfBlob();
            if (!result) return;

            const { pdfBlob, fileName, data } = result;

            if (window.deliverPdf) {
                await window.deliverPdf({
                    pdfBlob,
                    fileName,
                    formType: 'InisCare Staff Consent Form',
                    targetEmail: data.targetEmailVal,
                    metadata: {
                        'Name': data.nameVal || 'N/A',
                        'Address': data.addressVal || 'N/A',
                        'Phone': data.phoneVal || 'N/A',
                        'WhatsApp Consent': data.consentChecked ? 'Yes' : 'No',
                        'Target Email': data.targetEmailVal || 'Default Recipient'
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
            alert('Error generating PDF. Please try again.');
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
            alert('Please enter an email address in the field above to send this Consent Form.');
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
            const result = await buildConsentPdfBlob();
            if (!result) return;

            const { pdfBlob, fileName, data } = result;

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
                    formType: 'InisCare Staff Consent Form',
                    targetEmail: targetEmailVal,
                    metadata: {
                        'Name': data.nameVal,
                        'Address': data.addressVal || 'N/A',
                        'Phone': data.phoneVal || 'N/A',
                        'WhatsApp Consent': data.consentChecked ? 'Yes' : 'No',
                        'Target Email': targetEmailVal
                    }
                })
            });

            const resData = await res.json();
            if (res.ok && resData.success) {
                alert(`✅ Consent Form PDF sent successfully to ${targetEmailVal}!`);
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
                    console.log('✅ Consent Form PDF sent in background:', data);
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
