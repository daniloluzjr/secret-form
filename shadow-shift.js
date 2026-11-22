document.addEventListener('DOMContentLoaded', () => {
    const shadowCareName = document.getElementById('shadowCareName');
    const shadowSupervisorName = document.getElementById('shadowSupervisorName');
    const shadowClientName = document.getElementById('shadowClientName');
    const shadowShiftHours = document.getElementById('shadowShiftHours');
    const targetEmail = document.getElementById('targetEmail');
    const btnDownload = document.getElementById('btnDownloadPdf') || document.getElementById('btnGenerateShadow');
    const btnEmail = document.getElementById('btnSendEmail');

    // Dual Canvas & Dates
    const careCanvas = document.getElementById('careSigCanvas');
    const supCanvas = document.getElementById('supSigCanvas');
    const btnClearCareSig = document.getElementById('btnClearCareSig');
    const btnClearSupSig = document.getElementById('btnClearSupSig');
    const careSigDate = document.getElementById('careSigDate');
    const supSigDate = document.getElementById('supSigDate');

    const qAdditional = document.getElementById('qAdditional');

    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    if (careSigDate) careSigDate.value = formattedToday;
    if (supSigDate) supSigDate.value = formattedToday;

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

    // Touch tap helper for tablet/mobile: tap anywhere on a cell, and allow toggling radios/checkboxes
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
    const supPad = initPad(supCanvas);

    if (btnClearCareSig && carePad) {
        btnClearCareSig.addEventListener('click', (e) => {
            e.preventDefault();
            carePad.clear();
        });
    }

    if (btnClearSupSig && supPad) {
        btnClearSupSig.addEventListener('click', (e) => {
            e.preventDefault();
            supPad.clear();
        });
    }

    function esc(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    const BASE = 'font-family:Inter,Arial,sans-serif;font-size:10px;line-height:1.25;color:#000;box-sizing:border-box;';
    const YELLOW = 'background-color:#f9e493;';
    const BORDER = 'border:0.5px solid #444;';

    const tasks = [
        'Body wash',
        'Shower',
        'Oral Care',
        'Check skin integrity/repositioning',
        'Incontinence care',
        'Catheter care',
        'Medication reminders',
        'Meal preparation',
        'Assisting with exercises',
        'Bed making',
        'Light housekeeping',
        'Documenting in daily logs'
    ];

    const evalQuestions = [
        { id: 'eval_q1', text: 'Did the Care Assistant engage well with each Customer?' },
        { id: 'eval_q2', text: 'Did the Care Assistant engage well with other staff members (if present)?' },
        { id: 'eval_q3', text: 'Did the Care Assistant familiarise themselves with the care plans and risk assessments prior to starting the shift?' },
        { id: 'eval_q4', text: 'Did the Care Assistant adhere to correct infection prevention and control procedures?' },
        { id: 'eval_q5', text: 'Did the Care Assistant adhere to correct person moving and handling techniques?' },
        { id: 'eval_q6', text: 'Did the Care Assistant adhere to the confidentiality policy?' },
        { id: 'eval_q7', text: 'Did the Care Assistant clock in and out of each shift?' }
    ];

    // Interactive checkbox exclusivity: if N/A is checked, uncheck Observed and Completed; if either is checked, uncheck N/A
    tasks.forEach((_, i) => {
        const num = i + 1;
        const obsElem = document.getElementById(`taskObs${num}`);
        const compElem = document.getElementById(`taskComp${num}`);
        const naElem = document.getElementById(`taskNa${num}`);

        if (naElem) {
            naElem.addEventListener('change', () => {
                if (naElem.checked) {
                    if (obsElem) obsElem.checked = false;
                    if (compElem) compElem.checked = false;
                }
            });
        }
        if (obsElem) {
            obsElem.addEventListener('change', () => {
                if (obsElem.checked && naElem) {
                    naElem.checked = false;
                }
            });
        }
        if (compElem) {
            compElem.addEventListener('change', () => {
                if (compElem.checked && naElem) {
                    naElem.checked = false;
                }
            });
        }
    });

    async function buildPdfContainer(data, tasksState, evalAnswers, careSigDataUrl, supSigDataUrl) {
        let taskRowsHtml = '';
        tasks.forEach((t, i) => {
            const num = i + 1;
            const obs = tasksState[`obs_${num}`] ? '&#10003;' : '';
            const comp = tasksState[`comp_${num}`] ? '&#10003;' : '';
            const na = tasksState[`na_${num}`] ? '&#10003;' : '';
            taskRowsHtml += `
            <tr>
                <td style="${BASE}${BORDER}padding:2px 5px;font-size:9.5px;">${t}</td>
                <td style="${BASE}${BORDER}width:55px;text-align:center;font-weight:bold;color:#005952;font-size:10px;">${obs}</td>
                <td style="${BASE}${BORDER}width:55px;text-align:center;font-weight:bold;color:#005952;font-size:10px;">${comp}</td>
                <td style="${BASE}${BORDER}width:45px;text-align:center;font-weight:bold;color:#005952;font-size:10px;">${na}</td>
            </tr>`;
        });

        let evalRowsHtml = '';
        evalQuestions.forEach(q => {
            const ans = evalAnswers[q.id] || '';
            const checkY = ans === 'yes' ? '&#10003;' : '';
            const checkN = ans === 'no' ? '&#10003;' : '';
            const checkNa = ans === 'na' ? '&#10003;' : '';

            evalRowsHtml += `
            <tr>
                <td style="${BASE}${BORDER}padding:2px 5px;font-size:9.5px;">${q.text}</td>
                <td style="${BASE}${BORDER}text-align:center;width:45px;font-weight:bold;color:#005952;font-size:10px;">${checkY}</td>
                <td style="${BASE}${BORDER}text-align:center;width:45px;font-weight:bold;color:#005952;font-size:10px;">${checkN}</td>
                <td style="${BASE}${BORDER}text-align:center;width:45px;font-weight:bold;color:#005952;font-size:10px;">${checkNa}</td>
            </tr>`;
        });

        const careSigHtml = careSigDataUrl
            ? `<img src="${careSigDataUrl}" style="height:36px;max-height:36px;width:auto;object-fit:contain;display:block;">`
            : '<span style="${BASE}color:#aaa;font-size:9px;">(no signature)</span>';

        const supSigHtml = supSigDataUrl
            ? `<img src="${supSigDataUrl}" style="height:36px;max-height:36px;width:auto;object-fit:contain;display:block;">`
            : '<span style="${BASE}color:#aaa;font-size:9px;">(no signature)</span>';

        // 794px x 1120px = Strict A4 Portrait (Single Page Guaranteed)
        const html = `
        <div style="${BASE}width:794px;height:1120px;min-height:1120px;max-height:1120px;padding:20px 34px 16px 34px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;background:#fff;margin:0;overflow:hidden;position:relative;">
            <div>
                <!-- Logo -->
                <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
                    <img src="InisCare-logo.png" style="height:36px;width:auto;object-fit:contain;">
                </div>

                <!-- Banner -->
                <div style="${BASE}background-color:#005952;color:#fff;text-align:center;font-family:Outfit,sans-serif;font-size:13.5px;font-weight:700;padding:4px 8px;margin-bottom:7px;border-radius:2px;">
                    Care Assistant Shadow Shift
                </div>

                <!-- Top Metadata Table (2x2 grid) -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:7px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:160px;padding:3px 6px;font-weight:600;font-size:9.5px;">Name of Care Assistant</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9.5px;">${esc(data.careName)}</td>
                        <td style="${BASE}${YELLOW}${BORDER}width:120px;padding:3px 6px;font-weight:600;font-size:9.5px;">Supervisor</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9.5px;">${esc(data.supName)}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:600;font-size:9.5px;">Customer / Client</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9.5px;">${esc(data.clientName)}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:600;font-size:9.5px;">Shift Hours</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9.5px;">${esc(data.shiftHours)}</td>
                    </tr>
                </table>

                <!-- Core Tasks Table -->
                <div style="${BASE}font-weight:bold;margin-bottom:2px;color:#005952;font-size:10px;">Tasks Observed / Completed:</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:7px;">
                    <thead>
                        <tr>
                            <th style="${BASE}${YELLOW}${BORDER}text-align:left;padding:2.5px 5px;font-size:9px;">Task</th>
                            <th style="${BASE}${YELLOW}${BORDER}width:55px;text-align:center;padding:2.5px 2px;font-size:8.5px;">Observed</th>
                            <th style="${BASE}${YELLOW}${BORDER}width:55px;text-align:center;padding:2.5px 2px;font-size:8.5px;">Completed</th>
                            <th style="${BASE}${YELLOW}${BORDER}width:45px;text-align:center;padding:2.5px 2px;font-size:8.5px;">N/A</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${taskRowsHtml}
                    </tbody>
                </table>

                <!-- Performance & Compliance Review Table -->
                <div style="${BASE}font-weight:bold;margin-bottom:2px;color:#005952;font-size:10px;">Performance &amp; Compliance Review:</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:7px;">
                    <thead>
                        <tr>
                            <th style="${BASE}${YELLOW}${BORDER}text-align:left;padding:2.5px 5px;font-size:9px;">Evaluation Question</th>
                            <th style="${BASE}${YELLOW}${BORDER}width:45px;text-align:center;padding:2.5px 2px;font-size:8.5px;">Yes</th>
                            <th style="${BASE}${YELLOW}${BORDER}width:45px;text-align:center;padding:2.5px 2px;font-size:8.5px;">No</th>
                            <th style="${BASE}${YELLOW}${BORDER}width:45px;text-align:center;padding:2.5px 2px;font-size:8.5px;">N/A</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${evalRowsHtml}
                    </tbody>
                </table>

                <!-- Additional Comments -->
                <div style="${BASE}margin-bottom:6px;">
                    <div style="${BASE}font-weight:600;font-size:9.5px;margin-bottom:2px;">Additional Comments:</div>
                    <div style="${BASE}${BORDER}padding:3px 6px;min-height:26px;max-height:40px;overflow:hidden;background:#fff;font-size:8.5px;">
                        ${esc(data.additional) || '&nbsp;'}
                    </div>
                </div>
            </div>

            <!-- Signatures & Official A4 Footer -->
            <div>
                <div style="${BASE}font-weight:bold;color:#005952;font-size:10px;margin-bottom:3px;border-bottom:1px solid #005952;padding-bottom:1px;">
                    Signatures &amp; Acknowledgement
                </div>

                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:150px;font-weight:bold;padding:3px 6px;font-size:9px;">Care Assistant Signature</td>
                        <td style="${BASE}${BORDER}padding:2px 6px;background:#fff;height:36px;">${careSigHtml}</td>
                        <td style="${BASE}${YELLOW}${BORDER}width:45px;font-weight:bold;padding:3px 6px;font-size:9px;">Date</td>
                        <td style="${BASE}${BORDER}width:85px;padding:3px 6px;font-size:9px;">${esc(data.dateVal)}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}font-weight:bold;padding:3px 6px;font-size:9px;">Supervisor Signature</td>
                        <td style="${BASE}${BORDER}padding:2px 6px;background:#fff;height:36px;">${supSigHtml}</td>
                        <td style="${BASE}${YELLOW}${BORDER}font-weight:bold;padding:3px 6px;font-size:9px;">Date</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:9px;">${esc(data.dateVal)}</td>
                    </tr>
                </table>

                <div style="display:flex;justify-content:space-between;font-size:8.5px;color:#777;border-top:0.5px solid #ccc;padding-top:3px;">
                    <span>InisCare Care Assistant Shadow Shift &bull; Confidential</span>
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

    async function buildShadowPdfBlob() {
        const careVal = (shadowCareName.value || '').trim() || 'Care Assistant';

        const data = {
            careName: careVal,
            supName: (shadowSupervisorName.value || '').trim() || 'Supervisor',
            clientName: (shadowClientName ? shadowClientName.value : '').trim(),
            shiftHours: (shadowShiftHours ? shadowShiftHours.value : '').trim(),
            dateVal: formattedToday,
            additional: (qAdditional.value || '').trim(),
            targetEmail: (targetEmail.value || '').trim()
        };

        const tasksState = {};
        tasks.forEach((_, i) => {
            const num = i + 1;
            tasksState[`obs_${num}`] = document.getElementById(`taskObs${num}`)?.checked || false;
            tasksState[`comp_${num}`] = document.getElementById(`taskComp${num}`)?.checked || false;
            tasksState[`na_${num}`] = document.getElementById(`taskNa${num}`)?.checked || false;
        });

        const evalAnswers = {};
        evalQuestions.forEach(q => {
            const checkedRadio = document.querySelector(`input[name="${q.id}"]:checked`);
            evalAnswers[q.id] = checkedRadio ? checkedRadio.value : '';
        });

        const careSigDataUrl = (carePad && !carePad.isEmpty()) ? carePad.toDataURL('image/png') : null;
        const supSigDataUrl = (supPad && !supPad.isEmpty()) ? supPad.toDataURL('image/png') : null;

        const pdfWrapper = await buildPdfContainer(data, tasksState, evalAnswers, careSigDataUrl, supSigDataUrl);
        const fileName = `Shadow_Shift_${careVal.replace(/\s+/g, '_')}_${formattedToday.replace(/\//g, '-')}.pdf`;

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
            data
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
            const result = await buildShadowPdfBlob();
            if (!result) return;

            const { pdfBlob, fileName, data } = result;

            if (window.deliverPdf) {
                await window.deliverPdf({
                    pdfBlob,
                    fileName,
                    formType: 'Care Assistant Shadow Shift',
                    targetEmail: data.targetEmail,
                    metadata: {
                        'Care Assistant': data.careName,
                        'Supervisor': data.supName || 'N/A',
                        'Customer': data.clientName || 'N/A',
                        'Shift Hours': data.shiftHours || 'N/A',
                        'Date': data.dateVal,
                        'Target Email': data.targetEmail || 'Default Recipient'
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
            alert('Error generating Shadow Shift PDF. Please try again.');
            btnDownload.innerHTML = origHtml;
            btnDownload.disabled = false;
        }
    }

    // Action 2: Send PDF by Email
    async function handleSendEmail() {
        if (!btnEmail) return;

        const targetEmailVal = (targetEmail.value || '').trim();
        if (!targetEmailVal) {
            alert('Please enter an email address in the field above to send this Shadow Shift.');
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
            const result = await buildShadowPdfBlob();
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
                    formType: 'Care Assistant Shadow Shift',
                    targetEmail: targetEmailVal,
                    metadata: {
                        'Care Assistant': data.careName,
                        'Supervisor': data.supName || 'N/A',
                        'Customer': data.clientName || 'N/A',
                        'Shift Hours': data.shiftHours || 'N/A',
                        'Date': data.dateVal,
                        'Target Email': targetEmailVal
                    }
                })
            });

            const resData = await res.json();
            if (res.ok && resData.success) {
                alert(`✅ Shadow Shift PDF sent successfully to ${targetEmailVal}!`);
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
                    console.log('✅ Shadow Shift PDF sent in background:', data);
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
