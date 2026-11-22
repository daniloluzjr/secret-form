document.addEventListener('DOMContentLoaded', () => {
    const custName = document.getElementById('custName');
    const staffName = document.getElementById('staffName');
    const supName = document.getElementById('supName');
    const checkDate = document.getElementById('checkDate');
    const otherComments = document.getElementById('otherComments');
    const targetEmail = document.getElementById('targetEmail');
    const btnDownload = document.getElementById('btnDownloadPdf') || document.getElementById('btnGenerateSupervision');
    const btnEmail = document.getElementById('btnSendEmail');

    const careCanvas = document.getElementById('careSigCanvas');
    const supCanvas = document.getElementById('supSigCanvas');
    const btnClearCare = document.getElementById('btnClearCareSig');
    const btnClearSup = document.getElementById('btnClearSupSig');
    const careSigDate = document.getElementById('careSigDate');
    const supSigDate = document.getElementById('supSigDate');

    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    if (checkDate) checkDate.value = formattedToday;
    if (careSigDate) careSigDate.value = formattedToday;
    if (supSigDate) supSigDate.value = formattedToday;

    let careSigPad = null;
    let supSigPad = null;

    function setupCanvas(c) {
        if (!c || !window.SignaturePad) return null;
        const pad = new SignaturePad(c, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: 'rgb(0, 89, 82)',
            minWidth: 1.5,
            maxWidth: 3.5,
            throttle: 0
        });
        function resize() {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const wrapper = c.parentElement;
            if (wrapper) {
                const data = !pad.isEmpty() ? pad.toData() : null;
                const rect = wrapper.getBoundingClientRect();
                c.width = rect.width * ratio;
                c.height = (rect.height || 95) * ratio;
                c.getContext('2d').scale(ratio, ratio);
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

    careSigPad = setupCanvas(careCanvas);
    supSigPad = setupCanvas(supCanvas);

    if (btnClearCare && careSigPad) {
        btnClearCare.addEventListener('click', (e) => { e.preventDefault(); careSigPad.clear(); });
    }
    if (btnClearSup && supSigPad) {
        btnClearSup.addEventListener('click', (e) => { e.preventDefault(); supSigPad.clear(); });
    }

    function esc(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    const BASE = 'font-family:Inter,Arial,sans-serif;font-size:10.5px;line-height:1.3;color:#000;box-sizing:border-box;';
    const YELLOW = 'background-color:#f9e493;';
    const BORDER = 'border:0.5px solid #444;';

    const itemsPart1 = [
        { id: 'item1', text: 'Reports for work assignments as scheduled' },
        { id: 'item2', text: 'Wears appropriate uniform and has ID badge' },
        { id: 'item3', text: 'Demonstrates courteous behaviour towards the Customer and others' },
        { id: 'item4', text: 'Assists with personal care using appropriate techniques' },
        { id: 'item5', text: 'Delivers medication prompts effectively while working within their scope of practice' },
        { id: 'item6', text: 'Assists with Customers nutritional needs, while adhering to correct IPC protocol' },
        { id: 'item7', text: 'Demonstrates a good relationship with the Customer' },
        { id: 'item8', text: 'House is kept tidy and hygienic' }
    ];

    const itemsPart2 = [
        { id: 'item9', text: 'Demonstrates good communication skills' },
        { id: 'item10', text: 'Follows Customers Care Plan and risk assessments' },
        { id: 'item11', text: 'Documentation updated accordingly and professionally' },
        { id: 'item12', text: 'Adheres to InisCare Policy and Procedures' },
        { id: 'item13', text: 'Uses appropriate PM&H techniques' }
    ];

    function renderTableRows(items, ratings, commentsMap) {
        let html = '';
        items.forEach(item => {
            const r = ratings[item.id] || '';
            const c = commentsMap[item.id] || '';
            const cEx = r === 'exceeds' ? '&#10003;' : '';
            const cMe = r === 'meets' ? '&#10003;' : '';
            const cNo = r === 'not_met' ? '&#10003;' : '';
            const cOb = r === 'not_obs' ? '&#10003;' : '';

            html += `
            <tr>
                <td style="${BASE}${BORDER}padding:2.5px 5px;font-size:9.5px;">${item.text}</td>
                <td style="${BASE}${BORDER}text-align:center;width:55px;font-weight:bold;color:#005952;font-size:10.5px;">${cEx}</td>
                <td style="${BASE}${BORDER}text-align:center;width:55px;font-weight:bold;color:#005952;font-size:10.5px;">${cMe}</td>
                <td style="${BASE}${BORDER}text-align:center;width:65px;font-weight:bold;color:#005952;font-size:10.5px;">${cNo}</td>
                <td style="${BASE}${BORDER}text-align:center;width:50px;font-weight:bold;color:#005952;font-size:10.5px;">${cOb}</td>
                <td style="${BASE}${BORDER}padding:2.5px 5px;width:155px;font-size:9px;">${esc(c)}</td>
            </tr>`;
        });
        return html;
    }

    async function buildPdfContainer(formData, ratings, commentsMap, careSigUrl, supSigUrl) {
        const careSigHtml = careSigUrl
            ? `<img src="${careSigUrl}" style="height:38px;max-height:38px;width:auto;object-fit:contain;display:block;">`
            : '<span style="${BASE}color:#aaa;font-size:9px;">(no signature)</span>';

        const supSigHtml = supSigUrl
            ? `<img src="${supSigUrl}" style="height:38px;max-height:38px;width:auto;object-fit:contain;display:block;">`
            : '<span style="${BASE}color:#aaa;font-size:9px;">(no signature)</span>';

        // 794px x 1120px = Strict A4 Portrait (Single Page Guaranteed with natural top-to-bottom flow)
        const html = `
        <div style="${BASE}width:794px;height:1120px;min-height:1120px;max-height:1120px;padding:22px 34px 16px 34px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-start;background:#fff;margin:0;overflow:hidden;position:relative;">
            <div>
                <!-- Logo -->
                <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
                    <img src="InisCare-logo.png" style="height:36px;width:auto;object-fit:contain;">
                </div>

                <!-- Banner -->
                <div style="${BASE}background-color:#005952;color:#fff;text-align:center;font-family:Outfit,sans-serif;font-size:13.5px;font-weight:700;padding:4px 8px;margin-bottom:8px;border-radius:2px;">
                    Healthcare Assistant Supervision Checklist
                </div>

                <!-- Details Table (2x2 grid) -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:7px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:145px;padding:3px 6px;font-weight:600;font-size:9.5px;">Name of Customer</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9.5px;">${esc(formData.custName)}</td>
                        <td style="${BASE}${YELLOW}${BORDER}width:160px;padding:3px 6px;font-weight:600;font-size:9.5px;">Name of Staff Member</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9.5px;">${esc(formData.staffName)}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:600;font-size:9.5px;">Supervisor</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9.5px;">${esc(formData.supName)}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:600;font-size:9.5px;">Date</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9.5px;">${esc(formData.checkDate)}</td>
                    </tr>
                </table>

                <!-- Evaluation Criteria Table (All 13 items unified) -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:7px;">
                    <thead>
                        <tr>
                            <th style="${BASE}${YELLOW}${BORDER}text-align:left;padding:3px 5px;font-size:9.5px;">Evaluation Criteria</th>
                            <th style="${BASE}${YELLOW}${BORDER}text-align:center;width:55px;padding:3px 2px;font-size:8.5px;line-height:1.2;">Exceeds<br>req.</th>
                            <th style="${BASE}${YELLOW}${BORDER}text-align:center;width:55px;padding:3px 2px;font-size:8.5px;line-height:1.2;">Meets<br>req.</th>
                            <th style="${BASE}${YELLOW}${BORDER}text-align:center;width:65px;padding:3px 2px;font-size:8.5px;line-height:1.2;">Does not meet</th>
                            <th style="${BASE}${YELLOW}${BORDER}text-align:center;width:50px;padding:3px 2px;font-size:8.5px;line-height:1.2;">Not<br>obs.</th>
                            <th style="${BASE}${YELLOW}${BORDER}text-align:left;padding:3px 5px;width:155px;font-size:9.5px;">Comments</th>
                        </tr>
                        <tr style="${BASE}${YELLOW}">
                            <td colspan="6" style="${BASE}${YELLOW}${BORDER}font-weight:700;font-size:9px;padding:2px 5px;color:#005952;text-transform:uppercase;">Part 1 - Performance Criteria</td>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderTableRows(itemsPart1, ratings, commentsMap)}
                        <tr style="${BASE}${YELLOW}">
                            <td colspan="6" style="${BASE}${YELLOW}${BORDER}font-weight:700;font-size:9px;padding:2px 5px;color:#005952;text-transform:uppercase;">Part 2 - Compliance &amp; Procedures</td>
                        </tr>
                        ${renderTableRows(itemsPart2, ratings, commentsMap)}
                    </tbody>
                </table>

                <!-- Any other comments -->
                <div style="${BASE}margin-bottom:6px;">
                    <div style="${BASE}font-weight:600;font-size:9.5px;margin-bottom:2px;">Any other comments:</div>
                    <div style="${BASE}${BORDER}padding:3px 6px;min-height:30px;max-height:45px;overflow:hidden;background:#fff;font-size:9px;">
                        ${esc(formData.otherComments) || '&nbsp;'}
                    </div>
                </div>
            </div>

            <!-- Signatures & Official A4 Footer (Directly below comments) -->
            <div style="margin-top:10px;">
                <div style="${BASE}font-weight:bold;color:#005952;font-size:10px;margin-bottom:3px;border-bottom:1px solid #005952;padding-bottom:1px;">
                    Signatures &amp; Acknowledgement
                </div>

                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:150px;font-weight:bold;padding:3px 6px;font-size:9px;">Care Assistant Signature</td>
                        <td style="${BASE}${BORDER}padding:2px 6px;background:#fff;height:38px;">${careSigHtml}</td>
                        <td style="${BASE}${YELLOW}${BORDER}width:45px;font-weight:bold;padding:3px 6px;font-size:9px;">Date</td>
                        <td style="${BASE}${BORDER}width:85px;padding:3px 6px;font-size:9px;">${esc(formData.checkDate)}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}font-weight:bold;padding:3px 6px;font-size:9px;">Supervisor Signature</td>
                        <td style="${BASE}${BORDER}padding:2px 6px;background:#fff;height:38px;">${supSigHtml}</td>
                        <td style="${BASE}${YELLOW}${BORDER}font-weight:bold;padding:3px 6px;font-size:9px;">Date</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9px;">${esc(formData.checkDate)}</td>
                    </tr>
                </table>

                <div style="display:flex;justify-content:space-between;font-size:8.5px;color:#777;border-top:0.5px solid #ccc;padding-top:3px;">
                    <span>InisCare Healthcare Assistant Supervision Checklist &bull; Confidential</span>
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

    async function buildSupervisionPdfBlob() {
        const staffVal = (staffName.value || '').trim() || 'Staff Member';

        const formData = {
            custName: (custName.value || '').trim(),
            staffName: staffVal,
            supName: (supName.value || '').trim() || 'Supervisor',
            checkDate: formattedToday,
            otherComments: (otherComments.value || '').trim(),
            targetEmail: (targetEmail.value || '').trim()
        };

        const ratings = {};
        const commentsMap = {};

        [...itemsPart1, ...itemsPart2].forEach((item, idx) => {
            const num = idx + 1;
            const checked = document.querySelector(`input[name="item${num}"]:checked`);
            ratings[item.id] = checked ? checked.value : '';
            const commInput = document.getElementById(`comm${num}`);
            commentsMap[item.id] = commInput ? commInput.value.trim() : '';
        });

        const careSigUrl = (careSigPad && !careSigPad.isEmpty()) ? careSigPad.toDataURL('image/png') : null;
        const supSigUrl = (supSigPad && !supSigPad.isEmpty()) ? supSigPad.toDataURL('image/png') : null;

        const pdfWrapper = await buildPdfContainer(formData, ratings, commentsMap, careSigUrl, supSigUrl);
        const fileName = `Supervision_Checklist_${staffVal.replace(/\s+/g, '_')}_${formattedToday.replace(/\//g, '-')}.pdf`;

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
            formData
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
            const result = await buildSupervisionPdfBlob();
            if (!result) return;

            const { pdfBlob, fileName, formData } = result;

            if (window.deliverPdf) {
                await window.deliverPdf({
                    pdfBlob,
                    fileName,
                    formType: 'Healthcare Assistant Supervision Checklist',
                    targetEmail: formData.targetEmail,
                    metadata: {
                        'Customer': formData.custName || 'N/A',
                        'Staff Member': formData.staffName,
                        'Supervisor': formData.supName || 'N/A',
                        'Date': formData.checkDate,
                        'Target Email': formData.targetEmail || 'Default Recipient'
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
            alert('Error generating Supervision Checklist PDF. Please try again.');
            btnDownload.innerHTML = origHtml;
            btnDownload.disabled = false;
        }
    }

    // Action 2: Send PDF by Email
    async function handleSendEmail() {
        if (!btnEmail) return;

        const targetEmailVal = (targetEmail.value || '').trim();
        if (!targetEmailVal) {
            alert('Please enter an email address in the field above to send this Supervision Checklist.');
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
            const result = await buildSupervisionPdfBlob();
            if (!result) return;

            const { pdfBlob, fileName, formData } = result;

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
                    formType: 'Healthcare Assistant Supervision Checklist',
                    targetEmail: targetEmailVal,
                    metadata: {
                        'Customer': formData.custName || 'N/A',
                        'Staff Member': formData.staffName,
                        'Supervisor': formData.supName || 'N/A',
                        'Date': formData.checkDate,
                        'Target Email': targetEmailVal
                    }
                })
            });

            const resData = await res.json();
            if (res.ok && resData.success) {
                alert(`✅ Supervision Checklist PDF sent successfully to ${targetEmailVal}!`);
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
                    console.log('✅ Supervision PDF sent in background:', data);
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
