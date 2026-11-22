/**
 * InisCare National Carer Competency Assessment (CCA) Controller
 * Multi-page A4 Portrait PDF Export with Dual Assessor Signatures
 */

document.addEventListener('DOMContentLoaded', () => {
    const candidateName = document.getElementById('candidateName');
    const careAssessorName = document.getElementById('careAssessorName');
    const clinicalAssessorName = document.getElementById('clinicalAssessorName');
    const careAssessorPrint = document.getElementById('careAssessorPrint');
    const clinicalAssessorPrint = document.getElementById('clinicalAssessorPrint');

    const ccaDateCompleted = document.getElementById('ccaDateCompleted');
    const careAssessorDate = document.getElementById('careAssessorDate');
    const clinicalAssessorDate = document.getElementById('clinicalAssessorDate');

    const btnDownload = document.getElementById('btnDownloadPdf');
    const btnEmail = document.getElementById('btnSendEmail');
    const targetEmail = document.getElementById('targetEmail');

    // Date formatting (DD/MM/YYYY)
    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // Auto-populate dates
    if (ccaDateCompleted) ccaDateCompleted.value = formattedToday;
    if (careAssessorDate) careAssessorDate.value = formattedToday;
    if (clinicalAssessorDate) clinicalAssessorDate.value = formattedToday;

    // Sync Assessor names
    if (careAssessorName && careAssessorPrint) {
        careAssessorName.addEventListener('input', () => {
            if (!careAssessorPrint.dataset.manual) careAssessorPrint.value = careAssessorName.value;
        });
    }
    if (clinicalAssessorName && clinicalAssessorPrint) {
        clinicalAssessorName.addEventListener('input', () => {
            if (!clinicalAssessorPrint.dataset.manual) clinicalAssessorPrint.value = clinicalAssessorName.value;
        });
    }

    // Helper to init signature pad
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
                if (data) pad.fromData(data);
            }
        }

        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', () => setTimeout(resize, 150));
        resize();
        return pad;
    }

    const carePad = initPad(document.getElementById('careAssessorSigCanvas'));
    const clinicalPad = initPad(document.getElementById('clinicalAssessorSigCanvas'));

    const btnClearCare = document.getElementById('btnClearCareAssessorSig');
    if (btnClearCare && carePad) {
        btnClearCare.addEventListener('click', (e) => {
            e.preventDefault();
            carePad.clear();
        });
    }

    const btnClearClinical = document.getElementById('btnClearClinicalAssessorSig');
    if (btnClearClinical && clinicalPad) {
        btnClearClinical.addEventListener('click', (e) => {
            e.preventDefault();
            clinicalPad.clear();
        });
    }

    // Touch tap helper for checking
    document.addEventListener('click', (e) => {
        const td = e.target.closest('.col-checkbox');
        if (td && e.target.tagName !== 'INPUT') {
            const input = td.querySelector('input[type="checkbox"]');
            if (input && !input.disabled) {
                input.checked = !input.checked;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });

    // Helper functions for PDF construction
    function esc(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    function getRadio(name, defaultVal = '') {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? el.value : defaultVal;
    }

    function getCheck(id) {
        const el = document.getElementById(id);
        return el && el.checked;
    }

    function getVal(id) {
        const el = document.getElementById(id);
        return el ? (el.value || '').trim() : '';
    }

    function checkMark(checked) {
        return checked ? '&#10003;' : '';
    }

    const BASE = 'font-family:Inter,Arial,sans-serif;font-size:9.5px;line-height:1.35;color:#000;box-sizing:border-box;';
    const YELLOW = 'background-color:#f9e493;';
    const BORDER = 'border:0.5px solid #444;';
    const SEC_HEADER = 'background-color:#005952;color:#fff;font-family:Outfit,sans-serif;font-size:11.5px;font-weight:700;padding:4px 8px;margin-bottom:6px;border-radius:2px;';

    // Criteria dataset for rendering clean PDF rows
    const sections = [
        {
            num: '1', title: 'Service User Safety',
            items: [
                { id: '1_1', text: 'Recognising a change or deterioration of Service User and report accordingly' },
                { id: '1_2', text: 'Moving and handling including hoist positioning, bed care' },
                { id: '1_3', text: 'Falls prevention including mobility aids' },
                { id: '1_4', text: 'Health & Safety including hazards & awareness of personal and Service User safety' },
                { id: '1_5', text: 'Personal & Environmental Infection Prevention & Control (PPE, hand hygiene, cleaning)' },
                { id: '1_6', text: 'Safeguarding of vulnerable adults' },
                { id: '1_7', text: 'Reporting risks and serious reportable events to agreed pathways' },
                { id: '1_8', text: 'Reporting concerns and complaints raised to relevant supervisors' }
            ]
        },
        {
            num: '2', title: 'Communications',
            items: [
                { id: '2_1', text: 'Feedback on the agreed Care Plan' },
                { id: '2_2', text: 'Record keeping which meets local and national policies' },
                { id: '2_3', text: 'Appropriate communication with Service Users and relatives in challenging situations' },
                { id: '2_4', text: 'Maintaining confidentiality and data protection' },
                { id: '2_5', text: 'Assisting Service User to understand and access their Home Care File' },
                { id: '2_6', text: 'Promotes empowerment, advocacy and independence' },
                { id: '2_7', text: 'Obtaining Service User consent in accordance with HSE National Consent Policy' },
                { id: '2_8', text: 'Effective interpersonal skills, courteous, appropriate, maintains confidentiality' }
            ]
        },
        {
            num: '3', title: 'Effective Team Member',
            items: [
                { id: '3_1', text: 'Adheres by individualised Service User Care Plan within parameters' },
                { id: '3_2', text: 'Being accountable for your actions' },
                { id: '3_3', text: 'Ensuring equality and diversity' },
                { id: '3_4', text: 'Understanding the importance of continuity of care' },
                { id: '3_5', text: 'Professional behaviours: treating all with respect and dignity' },
                { id: '3_6', text: 'Timely liaison with other team members, supervisor, line manager' }
            ]
        },
        {
            num: '4', title: 'Personal Hygiene',
            items: [
                { id: '4_1', text: 'Assisting with all personal care' },
                { id: '4_2', text: 'Providing oral hygiene including teeth/denture care' },
                { id: '4_3', text: 'Care of hair, nails and feet (not cutting of toe nails)' },
                { id: '4_4', text: 'Assisting with dressing and undressing' }
            ]
        },
        {
            num: '5', title: 'Promoting Continence',
            items: [
                { id: '5_1', text: 'Assist Service Users to toilet / Managing incontinence wear' },
                { id: '5_2', text: 'Use of a commode' },
                { id: '5_3', text: 'Catheter care if required' },
                { id: '5_4', text: 'Emptying urinary devices' },
                { id: '5_5', text: 'Awareness of skin integrity with respect to continence care' }
            ]
        },
        {
            num: '6', title: 'Nutrition & Hydration',
            items: [
                { id: '6_1', text: 'Assist with eating and drinking per agreed Care Plan' },
                { id: '6_2', text: 'Promote choice' },
                { id: '6_3', text: 'Promote independence' },
                { id: '6_4', text: 'Record food and fluid input/output if required' },
                { id: '6_5', text: 'Knowledge of food hygiene / preparation and food storage' }
            ]
        },
        {
            num: '7', title: 'Social, Emotional & Cultural Care',
            items: [
                { id: '7_1', text: 'Awareness of social, emotional, spiritual and cultural wellbeing' },
                { id: '7_2', text: 'Awareness and sensitivity to individual will and preference' }
            ]
        },
        {
            num: '8', title: 'General Professional Ethos',
            items: [
                { id: '8_1', text: 'Understanding relationships with other disciplines' },
                { id: '8_2', text: 'Understanding relationship with Supervisor' },
                { id: '8_3', text: 'Understanding relationships with colleagues' },
                { id: '8_4', text: 'Understanding relationship with Service Users' },
                { id: '8_5', text: 'Understanding relationship with Service User supportive persons' },
                { id: '8_6', text: 'Understanding role as a carer' },
                { id: '8_7', text: 'Knowledge of company policies and procedures' }
            ]
        },
        {
            num: '9', title: 'Pressure Area Care',
            items: [
                { id: '9_1', text: 'Inspection of pressure points and alert if required' },
                { id: '9_2', text: 'Knowledge of different grades of pressure ulcers' },
                { id: '9_3', text: 'Pressure ulcer prevention, position change, safe skin care' },
                { id: '9_4', text: 'Catheter and Stoma Care as appropriate' },
                { id: '9_5', text: 'Appropriate use / reporting of faulty equipment to line manager' }
            ]
        }
    ];

    function renderSectionTable(sec, pad = '2px 5px', marginB = '5px') {
        let rows = '';
        sec.items.forEach(item => {
            const isObs = getCheck(`obs${item.id}`);
            const passVal = getRadio(`pass${item.id}`);
            const commVal = getVal(`comm${item.id}`);

            const passBadge = passVal === 'Yes' 
                ? '<strong style="color:#166534;">Pass</strong>' 
                : passVal === 'No' 
                    ? '<strong style="color:#b91c1c;">No</strong>' 
                    : '<span style="color:#888;">-</span>';

            rows += `
            <tr>
                <td style="${BASE}${BORDER}padding:${pad};">${item.text}</td>
                <td style="${BASE}${BORDER}width:45px;text-align:center;font-weight:bold;color:#005952;">${checkMark(isObs)}</td>
                <td style="${BASE}${BORDER}width:50px;text-align:center;">${passBadge}</td>
                <td style="${BASE}${BORDER}width:165px;padding:${pad};font-size:8.5px;">${esc(commVal)}</td>
            </tr>`;
        });

        return `
        <div style="${SEC_HEADER}">${sec.num}. Skills Assessment &bull; ${sec.title}</div>
        <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:${marginB};">
            <tr style="${YELLOW}">
                <th style="${BASE}${BORDER}padding:2px 5px;text-align:left;">Demonstrated Carer Ability</th>
                <th style="${BASE}${BORDER}width:45px;text-align:center;">Observed</th>
                <th style="${BASE}${BORDER}width:50px;text-align:center;">Result</th>
                <th style="${BASE}${BORDER}width:165px;text-align:left;padding:2px 5px;">Assessor Comments</th>
            </tr>
            ${rows}
        </table>`;
    }

    // Build the Multi-Page PDF Container (A4 Portrait, 2 Pages Exact: 794px x 1120px)
    async function buildPdfContainer() {
        const careSigUrl = (carePad && !carePad.isEmpty()) ? carePad.toDataURL('image/png') : null;
        const clinicalSigUrl = (clinicalPad && !clinicalPad.isEmpty()) ? clinicalPad.toDataURL('image/png') : null;

        function sigHtml(url) {
            return url
                ? `<img src="${url}" style="height:36px;max-height:36px;width:auto;object-fit:contain;display:block;">`
                : `<span style="${BASE}color:#aaa;font-style:italic;height:36px;display:flex;align-items:center;">(Signed digitally)</span>`;
        }

        const candidateVal = getVal('candidateName') || 'Candidate';
        const outcomeVal = getRadio('overallOutcome', '');
        const overallResult = outcomeVal === 'Competent'
            ? '<strong style="color:#166534;font-size:10px;">COMPETENT / PASS (All standards achieved)</strong>'
            : (outcomeVal === 'ActionRequired'
                ? '<strong style="color:#b91c1c;font-size:10px;">ACTION PLAN REQUIRED (Needs follow-up)</strong>'
                : '<span style="color:#777;font-size:10px;font-style:italic;">(Pending evaluation)</span>');

        const html = `
        <div style="${BASE}width:794px;background:#fff;margin:0;padding:0;">

            <!-- ================= PAGE 1: DETAILS + PROTOCOL + SECTIONS 1, 2, 3, 4 ================= -->
            <div style="width:794px;height:1120px;min-height:1120px;max-height:1120px;padding:18px 30px 16px 30px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-start;page-break-after:always;background:#fff;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <div style="font-size:10.5px;font-weight:700;color:#005952;text-transform:uppercase;letter-spacing:0.5px;">National Clinical Framework &bull; Healthcare Assistant</div>
                    <img src="InisCare-logo.png" style="height:30px;width:auto;object-fit:contain;">
                </div>
                <div style="${SEC_HEADER}font-size:12px;text-align:center;padding:4px;margin-top:0;margin-bottom:5px;">National Carer Competency Assessment (CCA)</div>

                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:5px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:2px 6px;font-weight:bold;">Candidate’s Name:</td>
                        <td style="${BASE}${BORDER}width:40%;padding:2px 6px;">${esc(candidateVal)}</td>
                        <td style="${BASE}${YELLOW}${BORDER}width:18%;padding:2px 6px;font-weight:bold;">Assessment Date:</td>
                        <td style="${BASE}${BORDER}width:22%;padding:2px 6px;">${esc(getVal('ccaDateCompleted'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2px 6px;font-weight:bold;">Candidate’s Address:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2px 6px;">${esc(getVal('candidateAddress'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2px 6px;font-weight:bold;">Organisation:</td>
                        <td style="${BASE}${BORDER}padding:2px 6px;">${esc(getVal('orgName'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2px 6px;font-weight:bold;">Care Assessor:</td>
                        <td style="${BASE}${BORDER}padding:2px 6px;">${esc(getVal('careAssessorName'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2px 6px;font-weight:bold;">Clinical Assessor:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2px 6px;">${esc(getVal('clinicalAssessorName'))}</td>
                    </tr>
                </table>

                <div style="background:#f8fafc;border:0.5px solid #cbd5e1;border-radius:2px;padding:4px 8px;margin-bottom:5px;font-size:8.5px;line-height:1.35;color:#334155;">
                    <strong>Assessment Protocol:</strong> Insert a tick (&check;) in Column 2 when observed. Select <strong>Pass</strong> or <strong>No</strong> in Column 3 if the observed task meets required standards. If not to standard, document required corrective actions under Assessor Comments. Assessor must possess appropriate qualifications to assess candidates.
                </div>

                ${renderSectionTable(sections[0], '2.5px 5px', '5px')}
                ${renderSectionTable(sections[1], '2.5px 5px', '5px')}
                ${renderSectionTable(sections[2], '2.5px 5px', '5px')}
                ${renderSectionTable(sections[3], '2.5px 5px', '5px')}

                <div style="margin-top:auto;padding-top:5px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;font-size:8.5px;color:#64748b;">
                    <span>InisCare &bull; National Carer Competency Assessment</span>
                    <span>Page 1 of 2</span>
                </div>
            </div>

            <!-- ================= PAGE 2: SECTIONS 5, 6, 7, 8, 9 + OUTCOME + DUAL SIGN-OFF ================= -->
            <div style="width:794px;height:1120px;min-height:1120px;max-height:1120px;padding:18px 30px 16px 30px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:flex-start;background:#fff;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <div style="font-size:10.5px;font-weight:700;color:#005952;text-transform:uppercase;letter-spacing:0.5px;">Competency Evaluation &amp; Dual Certification (Continued)</div>
                    <img src="InisCare-logo.png" style="height:28px;width:auto;object-fit:contain;">
                </div>

                ${renderSectionTable(sections[4], '2.5px 5px', '5px')}
                ${renderSectionTable(sections[5], '2.5px 5px', '5px')}
                ${renderSectionTable(sections[6], '2.5px 5px', '5px')}
                ${renderSectionTable(sections[7], '2.5px 5px', '5px')}
                ${renderSectionTable(sections[8], '2.5px 5px', '5px')}

                <div style="${SEC_HEADER}margin-top:5px;margin-bottom:4px;">Overall Competency Outcome &amp; Assessor Sign-Off</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:5px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:22%;padding:3px 6px;font-weight:bold;">Overall Result:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">${overallResult}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:bold;">Assessor Comments:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;font-size:8.5px;">${esc(getVal('overallAssessorComments')) || 'All criteria successfully observed and evaluated to national standards.'}</td>
                    </tr>
                </table>

                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-top:4px;">
                    <tr style="${YELLOW}">
                        <th style="${BASE}${BORDER}width:50%;padding:3px 6px;text-align:left;">Care Assessor Sign-off</th>
                        <th style="${BASE}${BORDER}width:50%;padding:3px 6px;text-align:left;">Clinical Assessor Sign-off</th>
                    </tr>
                    <tr>
                        <td style="${BASE}${BORDER}padding:6px;">
                            ${sigHtml(careSigUrl)}
                            <div style="font-size:8.5px;margin-top:3px;border-top:1px dashed #cbd5e1;padding-top:3px;">
                                <strong>Name:</strong> ${esc(getVal('careAssessorPrint')) || esc(getVal('careAssessorName'))}<br>
                                <strong>Date:</strong> ${esc(getVal('careAssessorDate'))}
                            </div>
                        </td>
                        <td style="${BASE}${BORDER}padding:6px;">
                            ${sigHtml(clinicalSigUrl)}
                            <div style="font-size:8.5px;margin-top:3px;border-top:1px dashed #cbd5e1;padding-top:3px;">
                                <strong>Name:</strong> ${esc(getVal('clinicalAssessorPrint')) || esc(getVal('clinicalAssessorName'))}<br>
                                <strong>Date:</strong> ${esc(getVal('clinicalAssessorDate'))}
                            </div>
                        </td>
                    </tr>
                </table>

                <div style="margin-top:auto;padding-top:5px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;font-size:8.5px;color:#64748b;">
                    <span>InisCare CCA &bull; Certified &amp; Audited</span>
                    <span>Page 2 of 2</span>
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

        const imgs = container.querySelectorAll('img');
        await Promise.all(Array.from(imgs).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(res => { img.onload = res; img.onerror = res; });
        }));
        await new Promise(res => setTimeout(res, 80));

        return container;
    }

    // Generate PDF Blob
    async function buildCcaPdfBlob() {
        const candVal = (candidateName.value || '').trim() || 'Candidate';
        const dateVal = formattedToday.replace(/\//g, '-');
        const fileName = `Carer_Competency_Assessment_${candVal.replace(/\s+/g, '_')}_${dateVal}.pdf`;
        const container = await buildPdfContainer();

        const opt = {
            margin: 0,
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(container.firstElementChild).output('blob');
        if (container && container.parentNode) container.parentNode.removeChild(container);

        return { blob: pdfBlob, fileName };
    }

    // Download Handler
    if (btnDownload) {
        btnDownload.addEventListener('click', async () => {
            btnDownload.disabled = true;
            const originalText = btnDownload.innerHTML;
            btnDownload.innerHTML = 'Generating A4 PDF...';

            try {
                const candVal = (candidateName ? candidateName.value : '').trim() || 'Candidate';
                const res = await buildCcaPdfBlob();
                if (res) {
                    if (window.deliverPdf) {
                        await window.deliverPdf({
                            pdfBlob: res.blob,
                            fileName: res.fileName,
                            formType: 'National Carer Competency Assessment (CCA)',
                            targetEmail: (targetEmail ? targetEmail.value.trim() : ''),
                            metadata: {
                                'Candidate': candVal,
                                'Care Assessor': getVal('careAssessorName') || 'N/A',
                                'Clinical Assessor': getVal('clinicalAssessorName') || 'N/A',
                                'Date': getVal('ccaDateCompleted') || formattedToday,
                                'Overall Result': getRadio('overallOutcome', 'Pending')
                            },
                            origBtn: btnDownload,
                            origHtml: originalText
                        });
                    } else {
                        const url = URL.createObjectURL(res.blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = res.fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        btnDownload.disabled = false;
                        btnDownload.innerHTML = originalText;
                    }
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred while generating the PDF: ' + err.message);
                btnDownload.disabled = false;
                btnDownload.innerHTML = originalText;
            }
        });
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
                    console.log('✅ CCA PDF sent in background:', data);
                }).catch(err => {
                    console.warn('⚠️ Network notice in background send:', err);
                });
            };
            reader.readAsDataURL(pdfBlob);
        } catch (e) {
            console.warn('⚠️ Failed to schedule background send:', e);
        }
    }

    // Email Handler
    if (btnEmail) {
        btnEmail.addEventListener('click', async () => {
            const email = (targetEmail.value || '').trim();
            const emailDomain = email.toLowerCase().split('@')[1];
            if (!email || !email.includes('@') || emailDomain !== 'iniscare.ie') {
                alert('Corporate Security Policy: Documents can only be sent to official InisCare email addresses (@iniscare.ie).');
                targetEmail.focus();
                return;
            }

            btnEmail.disabled = true;
            const originalText = btnEmail.innerHTML;
            btnEmail.innerHTML = 'Sending Email...';

            try {
                const candVal = (candidateName ? candidateName.value : '').trim() || 'Candidate';
                const res = await buildCcaPdfBlob();
                if (!res) return;

                const reader = new FileReader();
                reader.readAsDataURL(res.blob);
                reader.onloadend = async () => {
                    const base64data = reader.result;
                    const response = await fetch('/api/send-pdf', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            targetEmail: email,
                            formType: 'National Carer Competency Assessment (CCA)',
                            pdfBase64: base64data,
                            fileName: res.fileName,
                            metadata: {
                                'Candidate': candVal,
                                'Care Assessor': getVal('careAssessorName') || 'N/A',
                                'Clinical Assessor': getVal('clinicalAssessorName') || 'N/A',
                                'Date': getVal('ccaDateCompleted') || formattedToday,
                                'Overall Result': getRadio('overallOutcome', 'Pending'),
                                'Recipient': email
                            }
                        })
                    });

                    const data = await response.json();
                    if (response.ok && data.success) {
                        alert(`Carer Competency Assessment successfully sent to ${email}!`);
                    } else {
                        alert(`Failed to send email: ${data.error || 'Server error'}`);
                    }
                };
            } catch (err) {
                console.error(err);
                alert('An error occurred while sending the email: ' + err.message);
            } finally {
                btnEmail.disabled = false;
                btnEmail.innerHTML = originalText;
            }
        });
    }
});
