/**
 * InisCare Personal Support Plan (PSP) Controller
 * Multi-page A4 Portrait PDF Export with Vertical Risk Assessments
 */

document.addEventListener('DOMContentLoaded', () => {
    // Top-level fields
    const custName = document.getElementById('custName');
    const custAssessDate = document.getElementById('custAssessDate');
    const btnDownload = document.getElementById('btnDownloadPdf');
    const btnEmail = document.getElementById('btnSendEmail');
    const targetEmail = document.getElementById('targetEmail');

    // Date formatting (DD/MM/YYYY)
    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    // Auto-populate dates
    if (custAssessDate && !custAssessDate.value) custAssessDate.value = formattedToday;
    ['pmhDate', 'pmhSigDate', 'fallsDate', 'fallsSigDate', 'safetyDate', 'safetySigDate', 'adlSigDate', 'consentClientSigDate', 'consentRepDate', 'hkClientSigDate', 'hkRepDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = formattedToday;
    });

    // Auto-sync customer name across sections
    if (custName) {
        custName.addEventListener('input', () => {
            const val = custName.value;
            ['pmhCustName', 'fallsCustName', 'safetyCustName', 'consentCustName'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.dataset.manual) el.value = val;
            });
        });
    }

    // Helper to initialize a signature pad on a canvas
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
                canvas.height = (rect.height || 80) * ratio;
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

    // Initialize all 8 Signature Pads
    const adlPad = initPad(document.getElementById('adlSigCanvas'));
    const pmhPad = initPad(document.getElementById('pmhSigCanvas'));
    const fallsPad = initPad(document.getElementById('fallsSigCanvas'));
    const safetyPad = initPad(document.getElementById('safetySigCanvas'));
    const consentClientPad = initPad(document.getElementById('consentClientSigCanvas'));
    const consentRepPad = initPad(document.getElementById('consentRepSigCanvas'));
    const hkClientPad = initPad(document.getElementById('hkClientSigCanvas'));
    const hkRepPad = initPad(document.getElementById('hkRepSigCanvas'));

    // Clear signature buttons
    function setupClear(btnId, pad) {
        const btn = document.getElementById(btnId);
        if (btn && pad) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                pad.clear();
            });
        }
    }

    setupClear('btnClearAdlSig', adlPad);
    setupClear('btnClearPmhSig', pmhPad);
    setupClear('btnClearFallsSig', fallsPad);
    setupClear('btnClearSafetySig', safetyPad);
    setupClear('btnClearConsentClientSig', consentClientPad);
    setupClear('btnClearConsentRepSig', consentRepPad);
    setupClear('btnClearHkClientSig', hkClientPad);
    setupClear('btnClearHkRepSig', hkRepPad);

    // Dynamic Medication Row Add/Remove
    const btnAddMed = document.getElementById('btnAddMedRow');
    const regMedBody = document.getElementById('regMedBody');
    if (btnAddMed && regMedBody) {
        btnAddMed.addEventListener('click', () => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="table-input med-name" placeholder="Medication name"></td>
                <td><input type="text" class="table-input med-dose" placeholder="Dose"></td>
                <td><input type="text" class="table-input med-freq" placeholder="Frequency"></td>
                <td style="text-align: center;"><button type="button" class="btn-del-row" onclick="removeMedRow(this)">&times;</button></td>
            `;
            regMedBody.appendChild(tr);
        });
    }

    const btnAddShortMed = document.getElementById('btnAddShortMedRow');
    const shortMedBody = document.getElementById('shortMedBody');
    if (btnAddShortMed && shortMedBody) {
        btnAddShortMed.addEventListener('click', () => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="table-input short-name" placeholder="Medication name"></td>
                <td><input type="text" class="table-input short-reason" placeholder="Reason"></td>
                <td><input type="text" class="table-input short-start" placeholder="DD/MM/YY"></td>
                <td><input type="text" class="table-input short-end" placeholder="DD/MM/YY"></td>
                <td style="text-align: center;"><button type="button" class="btn-del-row" onclick="removeMedRow(this)">&times;</button></td>
            `;
            shortMedBody.appendChild(tr);
        });
    }

    window.removeMedRow = function(btn) {
        const tr = btn.closest('tr');
        if (tr) tr.remove();
    };

    // Calculate Risk & Highlight 5x5 Matrix Cell
    window.calculateRisk = function(prefix) {
        const likEl = document.getElementById(`${prefix}Likelihood`);
        const impEl = document.getElementById(`${prefix}Impact`);
        const badgeEl = document.getElementById(`${prefix}ScoreBadge`);
        const tableEl = document.getElementById(`matrixTable${prefix.charAt(0).toUpperCase() + prefix.slice(1)}`);

        if (!likEl || !impEl || !badgeEl) return;

        if (!likEl.value || !impEl.value) {
            badgeEl.className = 'risk-score-badge risk-badge-neutral';
            badgeEl.textContent = 'Rating: Pending';
            if (tableEl) {
                tableEl.querySelectorAll('td[data-cell]').forEach(td => td.classList.remove('active-matrix-cell'));
            }
            return;
        }

        const lik = parseInt(likEl.value, 10) || 1;
        const imp = parseInt(impEl.value, 10) || 1;
        const score = lik * imp;

        let level = 'Low';
        let badgeClass = 'risk-badge-low';
        if (score >= 15) {
            level = 'High';
            badgeClass = 'risk-badge-high';
        } else if (score >= 6) {
            level = 'Medium';
            badgeClass = 'risk-badge-med';
        }

        badgeEl.className = `risk-score-badge ${badgeClass}`;
        badgeEl.textContent = `Rating: ${score} (${level})`;

        // Highlight Matrix Cell
        if (tableEl) {
            tableEl.querySelectorAll('td[data-cell]').forEach(td => {
                td.classList.remove('active-matrix-cell');
            });
            const activeCell = tableEl.querySelector(`td[data-cell="${lik}-${imp}"]`);
            if (activeCell) activeCell.classList.add('active-matrix-cell');
        }
    };

    // Initialize neutral state for risk assessments
    calculateRisk('pmh');
    calculateRisk('falls');
    calculateRisk('safety');

    // Touch tap helper for checkbox cells
    document.addEventListener('click', (e) => {
        const td = e.target.closest('.col-checkbox');
        if (td && e.target.tagName !== 'INPUT') {
            const input = td.querySelector('input[type="checkbox"], input[type="radio"]');
            if (input && !input.disabled) {
                input.checked = input.type === 'checkbox' ? !input.checked : true;
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

    const BASE = 'font-family:Inter,Arial,sans-serif;font-size:10px;line-height:1.35;color:#000;box-sizing:border-box;';
    const YELLOW = 'background-color:#f9e493;';
    const BORDER = 'border:0.5px solid #444;';
    const SEC_HEADER = 'background-color:#005952;color:#fff;font-family:Outfit,sans-serif;font-size:12px;font-weight:700;padding:4px 8px;margin-bottom:6px;border-radius:2px;';

    // Build the Multi-Page PDF Container (A4 Portrait, 794px per page, 9-Page Complete Clinical Dossier)
    async function buildPdfContainer() {
        const clientVal = getVal('custName') || 'Client';

        // Signatures as Data URLs
        const adlSigUrl = (adlPad && !adlPad.isEmpty()) ? adlPad.toDataURL('image/png') : null;
        const pmhSigUrl = (pmhPad && !pmhPad.isEmpty()) ? pmhPad.toDataURL('image/png') : null;
        const fallsSigUrl = (fallsPad && !fallsPad.isEmpty()) ? fallsPad.toDataURL('image/png') : null;
        const safetySigUrl = (safetyPad && !safetyPad.isEmpty()) ? safetyPad.toDataURL('image/png') : null;
        const consentClientSigUrl = (consentClientPad && !consentClientPad.isEmpty()) ? consentClientPad.toDataURL('image/png') : null;
        const consentRepSigUrl = (consentRepPad && !consentRepPad.isEmpty()) ? consentRepPad.toDataURL('image/png') : null;
        const hkClientSigUrl = (hkClientPad && !hkClientPad.isEmpty()) ? hkClientPad.toDataURL('image/png') : null;
        const hkRepSigUrl = (hkRepPad && !hkRepPad.isEmpty()) ? hkRepPad.toDataURL('image/png') : null;

        function sigHtml(url, maxH = 38) {
            return url
                ? `<img src="${url}" style="height:${maxH}px;max-height:${maxH}px;width:auto;object-fit:contain;display:block;">`
                : `<span style="${BASE}color:#aaa;font-style:italic;">(Signed digitally)</span>`;
        }

        function checkBadge(checked, label) {
            const mark = checked ? '&#9632;' : '&#9633;';
            const style = checked ? 'font-weight:bold;color:#005952;' : 'color:#555;';
            return `<span style="${style}">${mark} ${label}</span>`;
        }

        function ynBadge(name) {
            const val = getRadio(name);
            if (!val) return '<span style="color:#aaa;">-</span>';
            return val === 'Yes' ? '<strong style="color:#15803d;">Y</strong>' : '<strong style="color:#b91c1c;">N</strong>';
        }

        function mcItem(label, rName, commId) {
            const r = getRadio(rName);
            const c = getVal(commId);
            const badge = r === 'Yes' ? '<strong style="color:#15803d;">Yes</strong>' : (r === 'No' ? '<span style="color:#555;">No</span>' : '-');
            return `<div style="margin-bottom:2px;">&bull; ${label}: ${badge}${c ? ` <em>(${esc(c)})</em>` : ''}</div>`;
        }

        // Build Medication Rows
        let regMedRowsHtml = '';
        document.querySelectorAll('#regMedBody tr').forEach(tr => {
            const name = tr.querySelector('.med-name')?.value || '';
            const dose = tr.querySelector('.med-dose')?.value || '';
            const freq = tr.querySelector('.med-freq')?.value || '';
            if (name || dose || freq) {
                regMedRowsHtml += `
                <tr>
                    <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(name)}</td>
                    <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(dose)}</td>
                    <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(freq)}</td>
                </tr>`;
            }
        });

        let shortMedRowsHtml = '';
        document.querySelectorAll('#shortMedBody tr').forEach(tr => {
            const name = tr.querySelector('.short-name')?.value || '';
            const reason = tr.querySelector('.short-reason')?.value || '';
            const start = tr.querySelector('.short-start')?.value || '';
            const end = tr.querySelector('.short-end')?.value || '';
            if (name || reason || start || end) {
                shortMedRowsHtml += `
                <tr>
                    <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(name)}</td>
                    <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(reason)}</td>
                    <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(start)}</td>
                    <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(end)}</td>
                </tr>`;
            }
        });

        // Days of care string
        const days = [];
        if (getCheck('dayMon')) days.push('Mon');
        if (getCheck('dayTue')) days.push('Tue');
        if (getCheck('dayWed')) days.push('Wed');
        if (getCheck('dayThu')) days.push('Thu');
        if (getCheck('dayFri')) days.push('Fri');
        if (getCheck('daySat')) days.push('Sat');
        if (getCheck('daySun')) days.push('Sun');
        const daysStr = days.join(', ');

        // Living Arrangements string
        const lives = [];
        if (getCheck('livesAlone')) lives.push('Alone');
        if (getCheck('livesSpouse')) lives.push('Spouse');
        if (getCheck('livesFamily')) lives.push('Family');
        if (getCheck('livesOther')) lives.push('Other');
        const livesStr = lives.join(', ');

        // Daily Shifts
        const shifts = [
            { name: 'Morning', time: getVal('shiftMornTime'), duties: getVal('shiftMornDuties') },
            { name: 'Afternoon', time: getVal('shiftAftTime'), duties: getVal('shiftAftDuties') },
            { name: 'Evening', time: getVal('shiftEveTime'), duties: getVal('shiftEveDuties') },
            { name: 'Night', time: getVal('shiftNightTime'), duties: getVal('shiftNightDuties') },
            { name: 'Overnight', time: getVal('shiftOverTime'), duties: getVal('shiftOverDuties') }
        ];
        let shiftRowsHtml = '';
        shifts.forEach(s => {
            if (s.time || s.duties || s.name === 'Morning' || s.name === 'Afternoon' || s.name === 'Evening') {
                shiftRowsHtml += `
                <tr>
                    <td style="${BASE}${BORDER}padding:3.5px 6px;font-weight:bold;">${s.name}</td>
                    <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(s.time)}</td>
                    <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(s.duties)}</td>
                </tr>`;
            }
        });

        // HTML Pages Structure (5 Complete, Proportioned & Fully-Utilized A4 Pages)
        const pagesHtml = `
        <div style="${BASE}width:794px;background:#fff;margin:0;padding:0;">

            <!-- ================= PAGE 1: CLIENT DETAILS, ACCESS, PROFILE & CARE PLAN SUMMARY ================= -->
            <div style="width:794px;min-height:1120px;padding:24px 34px;box-sizing:border-box;page-break-after:always;">
                <div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
                    <img src="InisCare-logo.png" style="height:36px;width:auto;object-fit:contain;">
                </div>
                <div style="${SEC_HEADER}font-size:13.5px;text-align:center;padding:4px;margin-bottom:6px;">Personal Support Plan (PSP)</div>

                <div style="${SEC_HEADER}">1. Customer Identification &amp; Key Details</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;">
                    <colgroup>
                        <col style="width:20%;">
                        <col style="width:30%;">
                        <col style="width:20%;">
                        <col style="width:30%;">
                    </colgroup>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Name:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('custName'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Prefers to be called:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('custPrefName'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Address:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('custAddress'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">DOB:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('custDob'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Telephone:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('custPhone'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Assessment Date:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('custAssessDate'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Reassessment Date:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('custReassessDate'))}</td>
                    </tr>
                </table>

                <div style="${BASE}font-weight:bold;margin:4px 0 2px 0;color:#005952;">Other Contact Details &amp; Multidisciplinary Team</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;">
                    <colgroup>
                        <col style="width:20%;">
                        <col style="width:30%;">
                        <col style="width:20%;">
                        <col style="width:30%;">
                    </colgroup>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Primary Contact:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('primContactName'))} (${esc(getVal('primContactRel'))})</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Phone / Mobile:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">Tel: ${esc(getVal('primContactPhone'))} &bull; Mob: ${esc(getVal('primContactMobile'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Address &amp; Email:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:3.5px 6px;">
                            Addr: ${esc(getVal('primContactAddr'))} &bull; Email: ${esc(getVal('primContactEmail'))}
                            ${getVal('primContactComm') ? `<br>Comments: ${esc(getVal('primContactComm'))}` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Second Contact:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('secContactName'))} (${esc(getVal('secContactRel'))})</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Phone / Mobile:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">Tel: ${esc(getVal('secContactPhone'))} &bull; Mob: ${esc(getVal('secContactMobile'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Address &amp; Email:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:3.5px 6px;">
                            Addr: ${esc(getVal('secContactAddr'))} &bull; Email: ${esc(getVal('secContactEmail'))}
                            ${getVal('secContactComm') ? `<br>Comments: ${esc(getVal('secContactComm'))}` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">GP Details:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('gpName'))} &bull; ${esc(getVal('gpPhone'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">PHN Details:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('phnName'))} &bull; ${esc(getVal('phnPhone'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Health Centre:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:3.5px 6px;">
                            ${esc(getVal('healthCentre'))} &bull; Number: ${esc(getVal('healthCentrePhone'))}
                            ${getVal('healthCentreComm') ? `&bull; Comments: ${esc(getVal('healthCentreComm'))}` : ''}
                        </td>
                    </tr>
                </table>

                <div style="${BASE}font-weight:bold;margin:4px 0 2px 0;color:#005952;">Property Access &amp; Living Arrangements</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;">
                    <colgroup>
                        <col style="width:20%;">
                        <col style="width:30%;">
                        <col style="width:20%;">
                        <col style="width:30%;">
                    </colgroup>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Access Preference:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('accessPref'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Gate Code:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('gateCode'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Keybox Location:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('keyboxLoc'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Keybox Code:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('keyboxCode'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Lock Door Leaving:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getRadio('lockDoor'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Alarm Code:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('alarmCode'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Security Camera:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('secCamera'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;">Living Arrangements:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getRadio('livingWith') || 'Alone')}</td>
                    </tr>
                </table>

                <div style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Bio / Personal Profile:</div>
                <div style="${BASE}${BORDER}padding:7px 8px;min-height:80px;line-height:1.4;margin-bottom:6px;">${esc(getVal('custBio'))}</div>

                <div style="${SEC_HEADER}">2. Health Information &amp; Care Plan Summary</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;">
                    <colgroup>
                        <col style="width:20%;">
                        <col style="width:30%;">
                        <col style="width:20%;">
                        <col style="width:30%;">
                    </colgroup>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Medical History:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('medHistory'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">PM&amp;H Equipment:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('pmhEquipment'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Walking Aids:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('walkingAids'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Allergies:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('allergies'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Pets:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('pets'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Understands Service:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getRadio('understandsService'))}</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">NOK Aware (if No):</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getRadio('nokAware'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Total Care Hours:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('careHoursWeek'))} / week</td>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Days of Care:</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(daysStr)}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Carer Preference:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getRadio('carerPref'))}</td>
                    </tr>
                </table>

                <div style="${BASE}font-weight:bold;margin:4px 0 2px 0;color:#005952;">Daily Visit Schedules &amp; Assigned Duties</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:8px;">
                    <colgroup>
                        <col style="width:20%;">
                        <col style="width:30%;">
                        <col style="width:50%;">
                    </colgroup>
                    <tr style="${YELLOW}">
                        <th style="${BASE}${BORDER}padding:3.5px 6px;text-align:left;">Shift</th>
                        <th style="${BASE}${BORDER}padding:3.5px 6px;text-align:left;">Preferred Time</th>
                        <th style="${BASE}${BORDER}padding:3.5px 6px;text-align:left;">Assigned Duties &amp; Care Activities</th>
                    </tr>
                    ${shiftRowsHtml}
                </table>

                <div style="text-align:right;font-size:9px;color:#777;margin-top:10px;">InisCare PSP &bull; Page 1 of 5</div>
            </div>

            <!-- ================= PAGE 2: MEDICATION RECORD & ADLs PART 1 (1 TO 5) ================= -->
            <div style="width:794px;min-height:1120px;padding:24px 34px;box-sizing:border-box;page-break-after:always;">
                <div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
                    <img src="InisCare-logo.png" style="height:34px;width:auto;object-fit:contain;">
                </div>

                <div style="${SEC_HEADER}">3. Medication Record</div>
                <div style="${BASE}font-weight:bold;margin:4px 0 3px 0;">Regularly Prescribed Medications</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr style="${YELLOW}">
                        <th style="${BASE}${BORDER}width:45%;padding:3.5px 7px;text-align:left;">Name of Tablet / Medication</th>
                        <th style="${BASE}${BORDER}width:25%;padding:3.5px 7px;text-align:left;">Dose</th>
                        <th style="${BASE}${BORDER}width:30%;padding:3.5px 7px;text-align:left;">Frequency / Timing</th>
                    </tr>
                    ${regMedRowsHtml || '<tr><td colspan="3" style="padding:4px 7px;text-align:center;color:#777;">No medications listed</td></tr>'}
                </table>

                <div style="${BASE}font-weight:bold;margin:4px 0 3px 0;">Additional Short Term / PRN Medication</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr style="${YELLOW}">
                        <th style="${BASE}${BORDER}width:35%;padding:3.5px 7px;text-align:left;">Name of Tablet / Medicine</th>
                        <th style="${BASE}${BORDER}width:30%;padding:3.5px 7px;text-align:left;">Reason for Prescription</th>
                        <th style="${BASE}${BORDER}width:17%;padding:3.5px 7px;text-align:left;">Start Date</th>
                        <th style="${BASE}${BORDER}width:18%;padding:3.5px 7px;text-align:left;">End Date</th>
                    </tr>
                    ${shortMedRowsHtml || '<tr><td colspan="4" style="padding:4px 7px;text-align:center;color:#777;">No short term medications</td></tr>'}
                </table>

                <div style="${BASE}${YELLOW}${BORDER}padding:3.5px 7px;font-weight:bold;margin-top:3px;">Medication Storage &amp; Compliance Notes:</div>
                <div style="${BASE}${BORDER}padding:5px 8px;min-height:36px;margin-bottom:8px;line-height:1.35;">${esc(getVal('medComments')) || 'Standard blister pack / pharmacy compliance monitored.'}</div>

                <div style="${SEC_HEADER}">4. Assessment of Activities of Daily Living (ADLs) &bull; Part 1</div>

                <!-- 1. Communication -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:7px;">
                    <tr style="${YELLOW}">
                        <th colspan="2" style="${BASE}${BORDER}padding:3.5px 7px;text-align:left;">1. Communication &bull; Vision, Hearing, Speech &amp; Cognition</th>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:3.8px 7px;font-weight:bold;">Care Needs &amp; Goal:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">${esc(getVal('adlCommNeeds'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.8px 7px;font-weight:bold;">Vision / Eyesight:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">
                            Status: <strong>${esc(getRadio('visionStatus'))}</strong> &bull; 
                            Aids: ${checkBadge(getCheck('visAidNone'), 'None')} ${checkBadge(getCheck('visAidGlasses'), 'Glasses')} ${checkBadge(getCheck('visAidMag'), 'Magnifier')} ${checkBadge(getCheck('visCleanDaily'), 'Clean daily')} ${checkBadge(getCheck('visCleanOwn'), 'Cleans own')}<br>
                            Carer actions: ${checkBadge(getCheck('visActionRange'), 'Close range')} ${checkBadge(getCheck('visActionRead'), 'Read to customer')} ${checkBadge(getCheck('visActionWrite'), 'Assist writing')} ${checkBadge(getCheck('visActionPhone'), 'Assist phone')}
                            ${getVal('visionOther') ? `<br>Eyecare notes: ${esc(getVal('visionOther'))}` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.8px 7px;font-weight:bold;">Hearing:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">
                            Status: <strong>${esc(getRadio('hearingStatus'))}</strong> &bull; 
                            Aids: ${checkBadge(getCheck('hearAidNone'), 'None')} ${checkBadge(getCheck('hearAidR'), 'R')} ${checkBadge(getCheck('hearAidL'), 'L')} ${checkBadge(getCheck('hearAidBoth'), 'Both')} ${checkBadge(getCheck('hearAdjVol'), 'Adjust vol')} ${checkBadge(getCheck('hearCheckBat'), 'Check batt')}<br>
                            Carer actions: ${checkBadge(getCheck('hearGainAtt'), 'Gain attention')} ${checkBadge(getCheck('hearSpeakLoud'), 'Speak slowly/clearly')} ${checkBadge(getCheck('hearMinNoise'), 'Minimise noise')} ${checkBadge(getCheck('hearAllowTime'), 'Allow time')} ${checkBadge(getCheck('hearStepByStep'), 'Step by step')}
                            ${getVal('hearingOther') ? `<br>Hearing notes: ${esc(getVal('hearingOther'))}` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.8px 7px;font-weight:bold;">Speech &amp; Language:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">
                            Speech: <strong>${esc(getRadio('speechStatus'))}</strong> &bull; 
                            Primary Language: <strong>${esc(getRadio('primaryLang'))}${getVal('primaryLangSpec') ? ` (${esc(getVal('primaryLangSpec'))})` : ''}</strong> &bull; 
                            Cognition: <strong>${esc(getRadio('cogStatus'))}</strong><br>
                            Communication Methods: ${checkBadge(getCheck('commVerbal'), 'Verbal')} ${checkBadge(getCheck('commNonVerbal'), 'Non-verbal')} ${checkBadge(getCheck('commWritten'), 'Written')} ${checkBadge(getCheck('commVisual'), 'Visual')}
                            ${getVal('speechOther') ? `<br>Speech notes: ${esc(getVal('speechOther'))}` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.8px 7px;">Additional Comments:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">${esc(getVal('adlCommNotes'))}</td>
                    </tr>
                </table>

                <!-- 2. Mobility -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:7px;">
                    <tr style="${YELLOW}">
                        <th colspan="2" style="${BASE}${BORDER}padding:3.5px 7px;text-align:left;">2. Mobility &bull; Transfers &amp; Walking</th>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:3.8px 7px;font-weight:bold;">Care Needs &amp; Goal:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">${esc(getVal('adlMobNeeds'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.8px 7px;font-weight:bold;">Mobility Status:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">
                            Assistance: ${checkBadge(getCheck('mob1Assist'), '1 to assist')} ${checkBadge(getCheck('mob2Assist'), '2 to assist')} ${checkBadge(getCheck('mobSupervise'), 'Supervise')} ${checkBadge(getCheck('mobProvideDir'), 'Provide direction')} ${checkBadge(getCheck('mobEncourage'), 'Encourage')} &bull; Physio: <strong>${esc(getRadio('mobPhysio'))}</strong><br>
                            Conditions: ${checkBadge(getCheck('mobHipRep'), 'Hip replacement')} ${checkBadge(getCheck('mobAmputee'), 'Amputee')} ${checkBadge(getCheck('mobStatusNone'), 'N/A')}<br>
                            Walking Aids: ${checkBadge(getCheck('mobStick'), 'Stick')} ${checkBadge(getCheck('mobFrame'), 'Zimmer frame')} ${checkBadge(getCheck('mobWalker'), 'Wheeled walker')} ${checkBadge(getCheck('mobWheelchair'), 'Wheelchair')} ${checkBadge(getCheck('mobAidNone'), 'None')}<br>
                            Other Equipment: ${checkBadge(getCheck('mobBedRail'), 'Bed rail')} ${checkBadge(getCheck('mobSlideSheet'), 'Slide sheet')} ${checkBadge(getCheck('mobHoist'), 'Hoist')} ${checkBadge(getCheck('mobStandingHoist'), 'Standing hoist')} ${checkBadge(getCheck('mobEquipNone'), 'N/A')}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.8px 7px;">Additional Comments:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">${esc(getVal('adlMobNotes'))}</td>
                    </tr>
                </table>

                <!-- 3. Safe Environment -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:7px;">
                    <tr style="${YELLOW}">
                        <th colspan="2" style="${BASE}${BORDER}padding:3.5px 7px;text-align:left;">3. Maintaining a Safe Environment &bull; Safeguarding &amp; Home Safety</th>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:3.8px 7px;font-weight:bold;">Care Needs &amp; Goal:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">${esc(getVal('adlSafeNeeds'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.8px 7px;font-weight:bold;">Safeguarding &amp; Audit:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">
                            Aware of Safeguarding Policy: <strong>${esc(getRadio('safePolicy'))}</strong> &bull; 
                            Aware of Complaints Policy: <strong>${esc(getRadio('complaintPolicy'))}</strong><br>
                            Home Safety RA Completed: <strong>${esc(getRadio('homeRaComplete'))}</strong> &bull; 
                            Risks brought to attention of Field Care Supervisor: <strong>${esc(getRadio('risksBrought'))}</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.8px 7px;">Additional Comments:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">${esc(getVal('adlSafeNotes'))}</td>
                    </tr>
                </table>

                <!-- 4. Breathing & 5. Body Temperature -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:8px;">
                    <tr style="${YELLOW}">
                        <th colspan="2" style="${BASE}${BORDER}padding:3.5px 7px;text-align:left;">4. Breathing &amp; 5. Controlling Body Temperature</th>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:3.8px 7px;font-weight:bold;">Breathing Status:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">
                            Asthma / COPD: <strong>${esc(getRadio('hasCopd'))}</strong> &bull; 
                            Breathless on exertion/rest: <strong>${esc(getRadio('breathless'))}</strong> &bull; 
                            Oxygen required: <strong>${esc(getRadio('oxygenReq'))}</strong><br>
                            Inhalers required: <strong>${esc(getRadio('inhalers'))}</strong> &bull; 
                            Nebulisers required: <strong>${esc(getRadio('nebulisers'))}</strong>
                            ${getVal('adlBreathNotes') ? `<br>Additional comments: ${esc(getVal('adlBreathNotes'))}` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.8px 7px;font-weight:bold;">Body Temperature:</td>
                        <td style="${BASE}${BORDER}padding:3.8px 7px;">
                            Heating controls set: <strong>${esc(getRadio('heatSet'))}</strong> &bull; 
                            HCA permitted to adjust controls: <strong>${esc(getRadio('heatPermit'))}</strong><br>
                            Heating instructions: ${esc(getVal('heatInstruct'))}
                            ${getVal('adlHeatNotes') ? `<br>Additional comments: ${esc(getVal('adlHeatNotes'))}` : ''}
                        </td>
                    </tr>
                </table>

                <div style="text-align:right;font-size:9px;color:#777;margin-top:10px;">InisCare PSP &bull; Page 2 of 5</div>
            </div>

            <!-- ================= PAGE 3: ADLs PART 2 (6 TO 10), CLINICAL SIGN-OFF & ABOUT ME ================= -->
            <div style="width:794px;min-height:1120px;padding:24px 34px;box-sizing:border-box;page-break-after:always;">
                <div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
                    <img src="InisCare-logo.png" style="height:34px;width:auto;object-fit:contain;">
                </div>

                <div style="${SEC_HEADER}">4. Assessment of Activities of Daily Living (ADLs) &bull; Part 2</div>

                <!-- 6. Elimination -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr style="${YELLOW}">
                        <th colspan="2" style="${BASE}${BORDER}padding:3px 6px;text-align:left;">6. Elimination &amp; Continence Care</th>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:3px 6px;font-weight:bold;">Urinary Status:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            <strong>${esc(getRadio('urinaryStatus'))}</strong>${getVal('uriOther') ? ` (${esc(getVal('uriOther'))})` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:bold;">Bowel Status:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Status: <strong>${esc(getRadio('bowelStatus'))}</strong>${getVal('bowelOther') ? ` (${esc(getVal('bowelOther'))})` : ''} &bull; 
                            Pattern: ${esc(getVal('bowelPattern'))} &bull; 
                            Stoma Care: <strong>${esc(getRadio('stomaCare'))}</strong>${getVal('stomaSpecify') ? ` (${esc(getVal('stomaSpecify'))})` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:bold;">Aids &amp; Preferences:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Continence aids (Day): ${esc(getVal('contAidsDay'))} &bull; (Night): ${esc(getVal('contAidsNight'))}<br>
                            Toileting aids: ${checkBadge(getCheck('toilCommode'), 'Commode')} ${checkBadge(getCheck('toilUrinal'), 'Urinal')} ${checkBadge(getCheck('toilBedPan'), 'Bed pan')} ${checkBadge(getCheck('toilAidsNone'), 'N/A')}<br>
                            Routine &amp; Preferences: ${esc(getVal('toilPreferences'))}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;">Additional Comments:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">${esc(getVal('adlElimNotes'))}</td>
                    </tr>
                </table>

                <!-- 7. Pressure Area & Skin Care -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr style="${YELLOW}">
                        <th colspan="2" style="${BASE}${BORDER}padding:3px 6px;text-align:left;">7. Pressure Area &amp; Skin Care</th>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:3px 6px;font-weight:bold;">Skin Condition:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Condition: <strong>${esc(getRadio('skinCondition'))}</strong> &bull; 
                            Pressure areas intact: <strong>${esc(getRadio('pressureIntact'))}</strong>${getVal('pressureLocDesc') ? ` (${esc(getVal('pressureLocDesc'))})` : ''}<br>
                            Wounds / Breaks in skin: <strong>${esc(getRadio('woundsPresent'))}</strong>${getVal('woundsLocDesc') ? ` (${esc(getVal('woundsLocDesc'))})` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:bold;">Relief &amp; Regime:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Pressure relief aids: ${esc(getVal('skinReliefAids'))} &bull; 
                            Repositioning regime: ${esc(getVal('skinRegime'))}<br>
                            Skin care requirements: ${esc(getVal('skinCareReqs'))}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;">Additional Comments:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">${esc(getVal('adlSkinNotes'))}</td>
                    </tr>
                </table>

                <!-- 8. Medication Support -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr style="${YELLOW}">
                        <th colspan="2" style="${BASE}${BORDER}padding:3px 6px;text-align:left;">8. Medication Support &amp; Safe Administration</th>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:3px 6px;font-weight:bold;">Current Medications:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Types: ${checkBadge(getCheck('medTablets'), 'Tablets')} ${checkBadge(getCheck('medCreams'), 'Creams')} ${checkBadge(getCheck('medEyedrops'), 'Eyedrops')} ${checkBadge(getCheck('medEardrops'), 'Eardrops')} ${checkBadge(getCheck('medInjections'), 'Injections')} ${checkBadge(getCheck('medNebulisers'), 'Nebulisers')}${getVal('medCurrentOther') ? ` (${esc(getVal('medCurrentOther'))})` : ''}<br>
                            Form: <strong>${esc(getRadio('medForm'))}</strong> &bull; 
                            Assistance Required: <strong>${esc(getRadio('medAssistLevel'))}</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:bold;">Blood Sugar Testing:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Testing: <strong>${esc(getRadio('bslTest'))}</strong>${getVal('bslFreq') ? ` &bull; Frequency: ${esc(getVal('bslFreq'))}` : ''}${getRadio('bslAssist') ? ` &bull; Level: ${esc(getRadio('bslAssist'))}` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;">Additional Comments:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">${esc(getVal('adlMedNotes'))}</td>
                    </tr>
                </table>

                <!-- 9. Personal Hygiene & Grooming -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr style="${YELLOW}">
                        <th colspan="2" style="${BASE}${BORDER}padding:3px 6px;text-align:left;">9. Personal Hygiene, Bathing, Grooming &amp; Expressing Sexuality</th>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:3px 6px;font-weight:bold;">Bathing &amp; Washing:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Preference: <strong>${esc(getRadio('washPref'))}${getVal('washOtherSpec') ? ` (${esc(getVal('washOtherSpec'))})` : ''}</strong> &bull; 
                            Frequency: <strong>${esc(getRadio('washFreq'))}${getVal('freqOtherSpec') ? ` (${esc(getVal('freqOtherSpec'))})` : ''}</strong><br>
                            Transfer: <strong>${esc(getRadio('washTrans'))}${getVal('transOtherSpec') ? ` (${esc(getVal('transOtherSpec'))})` : ''}</strong> &bull; 
                            Aids: ${checkBadge(getCheck('aidShowerChair'), 'Shower chair')} ${checkBadge(getCheck('aidGrabBars'), 'Grab bars')} ${checkBadge(getCheck('aidWashOther'), 'Other')} ${checkBadge(getCheck('aidWashNone'), 'N/A')}<br>
                            Toiletries: ${checkBadge(getCheck('toilNormalSoap'), 'Normal soap')} ${checkBadge(getCheck('toilDeod'), 'Deodorant')} ${checkBadge(getCheck('toilAqueous'), 'Aqueous')} ${checkBadge(getCheck('toilMoist'), 'Moisturiser')} ${checkBadge(getCheck('toilSoapSub'), 'Soap sub')}${getVal('toilOtherSpec') ? ` (${esc(getVal('toilOtherSpec'))})` : ''} &bull; 
                            Hair: <strong>${esc(getRadio('hairWash'))}${getVal('hairWashOtherSpec') ? ` (${esc(getVal('hairWashOtherSpec'))})` : ''}</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:bold;">Grooming &amp; Dressing:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Shave: <strong>${esc(getRadio('groomShave'))}</strong>${getVal('groomShaveFreq') ? ` (${esc(getVal('groomShaveFreq'))})` : ''} &bull; 
                            Nails: <strong>${esc(getRadio('groomNails'))}${getVal('nailOtherSpec') ? ` (${esc(getVal('nailOtherSpec'))})` : ''}</strong><br>
                            Teeth / Dentures: <strong>${esc(getRadio('groomTeeth'))}</strong> &bull; 
                            Cleaning: <strong>${esc(getRadio('dentClean'))}${getVal('dentCleanOther') ? ` (${esc(getVal('dentCleanOther'))})` : ''}</strong> &bull; 
                            Dressing: <strong>${esc(getRadio('dressAssist'))}${getVal('dressOtherSpec') ? ` (${esc(getVal('dressOtherSpec'))})` : ''}</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:bold;">Expressing Sexuality:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Jewellery / Accessories: <strong>${esc(getRadio('sexAccessories'))}</strong> &bull; 
                            Nails painted: <strong>${esc(getRadio('sexNails'))}</strong> &bull; 
                            Hair styled: <strong>${esc(getRadio('sexHair'))}</strong> &bull; 
                            Make-up: <strong>${esc(getRadio('sexMakeup'))}</strong> &bull; 
                            Perfume / Aftershave: <strong>${esc(getRadio('sexPerfume'))}</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;">Additional Comments:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">${esc(getVal('adlHygieneNotes'))}</td>
                    </tr>
                </table>

                <!-- 10. Nutrition, Hydration, Sleeping & End of Life -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:7px;">
                    <tr style="${YELLOW}">
                        <th colspan="2" style="${BASE}${BORDER}padding:3px 6px;text-align:left;">10. Nutrition, Hydration, Sleeping, Social &amp; End of Life</th>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:3px 6px;font-weight:bold;">Diet &amp; Preparation:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Food Allergies: <strong>${esc(getVal('foodAllergies')) || 'None'}</strong> &bull; 
                            Appetite: <strong>${esc(getRadio('appetite'))}</strong> &bull; 
                            Diet Type: <strong>${esc(getRadio('dietType'))}${getVal('dietOtherSpec') ? ` (${esc(getVal('dietOtherSpec'))})` : ''}</strong><br>
                            Food Prep: <strong>${esc(getRadio('foodPrep'))}${getVal('foodPrepOther') ? ` (${esc(getVal('foodPrepOther'))})` : ''}</strong> &bull; 
                            Eating aids: ${checkBadge(getCheck('foodAidCrockery'), 'Crockery')} ${checkBadge(getCheck('foodAidCutlery'), 'Cutlery')} ${checkBadge(getCheck('foodAidBowl'), 'Bowl')} ${checkBadge(getCheck('foodAidPlate'), 'Plate')} ${checkBadge(getCheck('foodAidProtector'), 'Protector')}${getVal('foodAidOther') ? ` (${esc(getVal('foodAidOther'))})` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:bold;">Fluids &amp; Meals:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Fluids: <strong>${esc(getRadio('fluidCons'))}</strong> &bull; 
                            Drinking aids: ${checkBadge(getCheck('drinkCup'), 'Cup')} ${checkBadge(getCheck('drinkProtector'), 'Protector')}${getVal('drinkSpecialInst') ? ` (${esc(getVal('drinkSpecialInst'))})` : ''}<br>
                            Daily Meals: Breakfast: ${esc(getVal('mealBreakfast'))} &bull; Lunch: ${esc(getVal('mealLunch'))} &bull; Dinner: ${esc(getVal('mealDinner'))} &bull; Snacks: ${esc(getVal('mealSnacks'))}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:bold;">Sleeping Routine:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Times: Rise: ${esc(getVal('sleepRiseTime'))} &bull; Bed: ${esc(getVal('sleepBedTime'))} &bull; Rest: ${esc(getVal('sleepRestTime'))}<br>
                            Room: ${checkBadge(getCheck('sleepLight'), 'Light')} ${checkBadge(getCheck('sleepDoorOpen'), 'Door open')} ${checkBadge(getCheck('sleepDoorClosed'), 'Door closed')} ${checkBadge(getCheck('sleepBedRail'), 'Bed rail')}${getVal('sleepRoomOther') ? ` (${esc(getVal('sleepRoomOther'))})` : ''}<br>
                            Night: ${checkBadge(getCheck('sleepNightWear'), 'Nightwear')} ${checkBadge(getCheck('sleepNightToilet'), 'Toilet routine')}${getVal('sleepNightOther') ? ` (${esc(getVal('sleepNightOther'))})` : ''} &bull; Sleep aids: ${esc(getVal('sleepAids'))}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:bold;">Social &amp; Community:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Visits: ${esc(getVal('socialVisits'))} &bull; Cultural/Spiritual: ${esc(getVal('culturalNeeds'))} &bull; Hobbies: ${esc(getVal('socialHobbies'))}<br>
                            Community services: ${checkBadge(getCheck('csHomeHelp'), 'Home help')} ${checkBadge(getCheck('csRespite'), 'Respite')} ${checkBadge(getCheck('csMeals'), 'Meals')} ${checkBadge(getCheck('csDayService'), 'Day service')} ${checkBadge(getCheck('csPhn'), 'PHN')} ${checkBadge(getCheck('csPrivate'), 'Private')} ${checkBadge(getCheck('csTherapy'), 'Therapy')} ${checkBadge(getCheck('csNone'), 'None')}${getVal('csOtherSpec') ? ` (${esc(getVal('csOtherSpec'))})` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;font-weight:bold;">End of Life:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">
                            Receiving Palliative Care: <strong>${esc(getRadio('palliativeCare'))}</strong> &bull; Care Notes: ${esc(getVal('palliativeNotes'))}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3px 6px;">Additional Comments:</td>
                        <td style="${BASE}${BORDER}padding:3px 6px;">${esc(getVal('adlNutriNotes'))}</td>
                    </tr>
                </table>

                <div style="${BASE}border:0.5px solid #005952;padding:5px 8px;margin-bottom:7px;background:#f8fafc;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <strong>ADL Clinical Sign-off (Care Coordinator / Supervisor):</strong><br>
                        Name: <strong>${esc(getVal('adlAssessorName'))}</strong> &bull; Time: <strong>${esc(getVal('adlSigTime'))}</strong> &bull; Date: <strong>${esc(getVal('adlSigDate'))}</strong>
                    </div>
                    <div>${sigHtml(adlSigUrl)}</div>
                </div>

                <div style="${SEC_HEADER}">5. About Me &bull; Person-Centred Life Story</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr style="${YELLOW}">
                        <th style="${BASE}${BORDER}width:20%;padding:3.5px 6px;text-align:left;">Area</th>
                        <th style="${BASE}${BORDER}width:40%;padding:3.5px 6px;text-align:left;">Learning Outcomes</th>
                        <th style="${BASE}${BORDER}width:40%;padding:3.5px 6px;text-align:left;">The Best Way to Support Me</th>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">My Home Life</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('aboutHomeOutcomes'))}</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('aboutHomeLife'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">Friendships &amp; Social</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('aboutFriendOutcomes'))}</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('aboutFriendships'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:3.5px 6px;font-weight:bold;">My Life Now &amp; Goals</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('aboutLifeOutcomes'))}</td>
                        <td style="${BASE}${BORDER}padding:3.5px 6px;">${esc(getVal('aboutLifeGoals'))}</td>
                    </tr>
                </table>

                <div style="text-align:right;font-size:9px;color:#777;margin-top:10px;">InisCare PSP &bull; Page 3 of 5</div>
            </div>

            <!-- ================= PAGE 4: 6A. PERSON MOVING & HANDLING & 6B. FALLS RISK ASSESSMENT ================= -->
            <div style="width:794px;min-height:1120px;padding:24px 34px;box-sizing:border-box;page-break-after:always;">
                <div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
                    <img src="InisCare-logo.png" style="height:34px;width:auto;object-fit:contain;">
                </div>

                <div style="${SEC_HEADER}">6A. Person Moving &amp; Handling (PM&amp;H) Risk Assessment</div>

                <div style="${BASE}font-weight:bold;margin:4px 0 3px 0;">Clinical &amp; Environmental PM&amp;H Audit Checklist</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Current Mobility:</td>
                        <td style="${BASE}${BORDER}width:80%;padding:2.8px 6px;font-size:9.5px;">
                            Stand indep: ${checkMark(getCheck('pmhStandInd'))} &bull; Walk indep: ${checkMark(getCheck('pmhWalkInd'))} &bull; Assistance: ${checkMark(getCheck('pmhAssistReq'))} ${getVal('pmhCarersNum') ? `(Carers: ${esc(getVal('pmhCarersNum'))})` : ''} &bull; Aids: ${checkMark(getCheck('pmhAidsUsed'))} ${getVal('pmhAidsInUse') ? `(${esc(getVal('pmhAidsInUse'))})` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Care Assistant:</td>
                        <td style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">
                            Twisting: ${checkMark(getCheck('pmhTwist'))} &bull; Stooping: ${checkMark(getCheck('pmhStoop'))} &bull; Unstable posture: ${checkMark(getCheck('pmhPost'))} &bull; Strenuous: ${checkMark(getCheck('pmhStrenuous'))} &bull; Trained: ${checkMark(getCheck('pmhTrained'))} &bull; Alone: ${checkMark(getCheck('pmhAlone'))} &bull; Fit: ${checkMark(getCheck('pmhFit'))}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Environment:</td>
                        <td style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">
                            Uneven surfaces: ${checkMark(getCheck('pmhUneven'))} &bull; Floor variation: ${checkMark(getCheck('pmhFloorVar'))} &bull; Inadequate lighting: ${checkMark(getCheck('pmhLight'))} &bull; Bed/chair: ${checkMark(getCheck('pmhBedChair'))} &bull; Space: ${checkMark(getCheck('pmhSpace'))}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Customer Factors:</td>
                        <td style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">
                            Medication: ${checkMark(getCheck('pmhMedRel'))} &bull; Understands: ${checkMark(getCheck('pmhUnderstand'))} &bull; Cooperative: ${checkMark(getCheck('pmhCoop'))} &bull; Bariatric: ${checkMark(getCheck('pmhBariatric'))} &bull; Equipment: ${checkMark(getCheck('pmhEquipAvail'))} ${getVal('pmhEquipInPlace') ? `(${esc(getVal('pmhEquipInPlace'))})` : ''} &bull; Fall risk: ${checkMark(getCheck('pmhFallRisk'))}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Assessed Level:</td>
                        <td style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">
                            <strong>Handling Risk Level:</strong> ${esc(getRadio('pmhOverallLevel') || 'Low')}
                            ${getVal('pmhComments') ? ` &bull; <strong>Comments:</strong> ${esc(getVal('pmhComments'))}` : ''}
                        </td>
                    </tr>
                </table>

                <div style="${BASE}font-weight:bold;margin:4px 0 3px 0;">PM&amp;H Risk Management Action Plan</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:2.8px 6px;font-size:9.5px;">Office: <strong>${esc(getVal('pmhOffice'))}</strong></td>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:2.8px 6px;font-size:9.5px;">Source: <strong>${esc(getVal('pmhSource'))}</strong></td>
                        <td style="${BASE}${YELLOW}${BORDER}width:35%;padding:2.8px 6px;font-size:9.5px;">Client: <strong>${esc(getVal('pmhCustName'))}</strong></td>
                        <td style="${BASE}${YELLOW}${BORDER}width:25%;padding:2.8px 6px;font-size:9.5px;">Date: <strong>${esc(getVal('pmhDate'))}</strong></td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Hazard Description:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">${esc(getVal('pmhHazard'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Existing Controls:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">${esc(getVal('pmhExistingControls'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Additional Controls:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">${esc(getVal('pmhAdditionalControls'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-size:9.5px;">Owner &amp; Dates:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">
                            Owner: <strong>${esc(getVal('pmhOwner'))}</strong> &bull; Due: <strong>${esc(getVal('pmhDueDate'))}</strong> &bull; Review: <strong>${esc(getVal('pmhReviewDate'))}</strong> &bull; Status: <strong>${esc(getRadio('pmhStatus') || 'Open')}</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Calculated Rating:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.8px 6px;background:#f0fdf4;font-size:9.5px;">
                            Likelihood: <strong>${esc(getVal('pmhLikelihood'))}</strong> &times; Impact: <strong>${esc(getVal('pmhImpact'))}</strong> = 
                            <strong style="color:#005952;font-size:11px;"> ${parseInt(getVal('pmhLikelihood')||1)*parseInt(getVal('pmhImpact')||1)}</strong>
                            (Overall Handling Level: <strong>${esc(getRadio('pmhOverallLevel') || 'Low')}</strong>)
                        </td>
                    </tr>
                </table>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div style="${BASE}font-size:8.5px;color:#555;width:65%;">
                        InisCare have a duty of care to all staff and Customers. InisCare reserve the right to withdraw care if appropriate PM&H equipment is not available in the house.<br>
                        Signed Assessor: <strong>${esc(getVal('pmhPrintName'))}</strong> &bull; Date: <strong>${esc(getVal('pmhSigDate'))}</strong>
                    </div>
                    <div>${sigHtml(pmhSigUrl)}</div>
                </div>

                <div style="${SEC_HEADER}">6B. Falls Risk Assessment</div>

                <!-- Falls History -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Previous Falls:</td>
                        <td style="${BASE}${BORDER}width:30%;padding:2.8px 6px;font-size:9.5px;"><strong>${esc(getRadio('prevFalls'))}</strong></td>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Fear of Falling:</td>
                        <td style="${BASE}${BORDER}width:30%;padding:2.8px 6px;font-size:9.5px;"><strong>${esc(getRadio('fearFalling'))}</strong></td>
                    </tr>
                    ${getVal('fallsHistoryNotes') ? `
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Falls History / Dates:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">${esc(getVal('fallsHistoryNotes'))}</td>
                    </tr>` : ''}
                </table>

                <!-- Contributing Medical History (14 conditions) -->
                <div style="${BASE}font-weight:bold;margin:4px 0 3px 0;color:#005952;">Medical History (Contributing to Falls)</div>
                <div style="display:flex;gap:6px;margin-bottom:6px;font-size:8.5px;line-height:1.25;">
                    <div style="flex:1;border:0.5px solid #ccc;padding:4px 6px;background:#fcfcfc;">
                        ${mcItem('Visual impairment', 'fmVisual', 'fmVisualComm')}
                        ${mcItem('Cardiac arrhythmias', 'fmCardiac', 'fmCardiacComm')}
                        ${mcItem('Transient Ischaemic Attacks', 'fmTia', 'fmTiaComm')}
                        ${mcItem('Stroke', 'fmStroke', 'fmStrokeComm')}
                        ${mcItem("Parkinson's disease", 'fmParkinsons', 'fmParkinsonsComm')}
                        ${mcItem('Muscle weakness', 'fmMuscle', 'fmMuscleComm')}
                        ${mcItem('Decreased peripheral sensation', 'fmSens', 'fmSensComm')}
                    </div>
                    <div style="flex:1;border:0.5px solid #ccc;padding:4px 6px;background:#fcfcfc;">
                        ${mcItem('Osteoporosis', 'fmOsteo', 'fmOsteoComm')}
                        ${mcItem('Hypotension', 'fmHypo', 'fmHypoComm')}
                        ${mcItem('Incontinence / bowel urgency', 'fmIncont', 'fmIncontComm')}
                        ${mcItem('Dizziness', 'fmDizzy', 'fmDizzyComm')}
                        ${mcItem('Malnutrition', 'fmMalnut', 'fmMalnutComm')}
                        ${mcItem('Dehydration', 'fmDehyd', 'fmDehydComm')}
                        ${mcItem('Cognitive impairment', 'fmCognitive', 'fmCognitiveComm')}
                    </div>
                </div>
                ${getVal('fmOtherDesc') ? `<div style="${BASE}font-size:8.5px;margin-bottom:4px;"><strong>Other Medical:</strong> ${esc(getVal('fmOtherDesc'))}</div>` : ''}

                <!-- Medication & Environmental -->
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Medications:</td>
                        <td style="${BASE}${BORDER}width:80%;padding:2.8px 6px;font-size:9.5px;">
                            ${checkBadge(getCheck('fMedAnxiety'), 'Antianxiety')} 
                            ${checkBadge(getCheck('fMedNarcotic'), 'Narcotic')} 
                            ${checkBadge(getCheck('fMedAntidep'), 'Antidepressants')} 
                            ${checkBadge(getCheck('fMedHypnotic'), 'Hypnotics')} 
                            ${checkBadge(getCheck('fMedAntihyp'), 'Antihypertensives')} 
                            ${checkBadge(getCheck('fMedHypogly'), 'Hypoglycaemic')} 
                            ${checkBadge(getCheck('fMedCardiac'), 'Cardiac')} 
                            ${checkBadge(getCheck('fMedLaxative'), 'Laxatives')} 
                            ${checkBadge(getCheck('fMedDiuretic'), 'Diuretics')}
                            ${getVal('fMedOther') ? `<br>Other: ${esc(getVal('fMedOther'))}` : ''}
                            ${getVal('fMedComments') ? `<br>Comments: ${esc(getVal('fMedComments'))}` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Environment:</td>
                        <td style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">
                            Trip hazards: <strong>${esc(getRadio('feTrip'))}</strong>${getVal('feTripComm') ? ` (${esc(getVal('feTripComm'))})` : ''} &bull; 
                            Pets: <strong>${esc(getRadio('fePets'))}</strong>${getVal('fePetsComm') ? ` (${esc(getVal('fePetsComm'))})` : ''} &bull; 
                            Appropriate footwear: <strong>${esc(getRadio('feFootwear'))}</strong>${getVal('feFootwearComm') ? ` (${esc(getVal('feFootwearComm'))})` : ''}
                            ${getVal('feOtherFactors') ? `<br>Other factors: ${esc(getVal('feOtherFactors'))}` : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Actions Taken &amp; Rating:</td>
                        <td style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">
                            Actions: ${esc(getVal('feActionsTaken')) || 'Risk assessed and preventative measures implemented.'}<br>
                            Falls Risk Rating: <strong>${esc(getRadio('fallsRatingOverall') || 'Low')} Risk</strong>
                            ${getVal('fallsRatingReason') ? ` &bull; <em>Reason: ${esc(getVal('fallsRatingReason'))}` : ''}
                        </td>
                    </tr>
                </table>

                <div style="${BASE}font-weight:bold;margin:4px 0 3px 0;color:#005952;">Falls Risk Management Action Plan</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:2.8px 6px;font-size:9.5px;">Office: <strong>${esc(getVal('fallsOffice'))}</strong></td>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:2.8px 6px;font-size:9.5px;">Source: <strong>${esc(getVal('fallsSource'))}</strong></td>
                        <td style="${BASE}${YELLOW}${BORDER}width:35%;padding:2.8px 6px;font-size:9.5px;">Client: <strong>${esc(getVal('fallsCustName'))}</strong></td>
                        <td style="${BASE}${YELLOW}${BORDER}width:25%;padding:2.8px 6px;font-size:9.5px;">Date: <strong>${esc(getVal('fallsDate'))}</strong></td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Hazard Description:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">${esc(getVal('fallsHazard'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Existing Controls:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">${esc(getVal('fallsExistingControls'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Additional Controls:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">${esc(getVal('fallsAdditionalControls'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-size:9.5px;">Owner &amp; Dates:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.8px 6px;font-size:9.5px;">
                            Owner: <strong>${esc(getVal('fallsOwner'))}</strong> &bull; Due: <strong>${esc(getVal('fallsDueDate'))}</strong> &bull; Review: <strong>${esc(getVal('fallsReviewDate'))}</strong> &bull; Status: <strong>${esc(getRadio('fallsStatus') || 'Open')}</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.8px 6px;font-weight:bold;font-size:9.5px;">Calculated Rating:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.8px 6px;background:#fef3c7;font-size:9.5px;">
                            Likelihood: <strong>${esc(getVal('fallsLikelihood'))}</strong> &times; Impact: <strong>${esc(getVal('fallsImpact'))}</strong> = 
                            <strong style="color:#b45309;font-size:11px;"> ${parseInt(getVal('fallsLikelihood')||1)*parseInt(getVal('fallsImpact')||1)}</strong>
                            (Falls Rating: <strong>${esc(getRadio('fallsRatingOverall') || 'Low')}</strong>)
                        </td>
                    </tr>
                </table>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                    <div>Signed Assessor: <strong>${esc(getVal('fallsPrintName'))}</strong> &bull; Date: <strong>${esc(getVal('fallsSigDate'))}</strong></div>
                    <div>${sigHtml(fallsSigUrl)}</div>
                </div>

                <div style="text-align:right;font-size:9px;color:#777;margin-top:10px;">InisCare PSP &bull; Page 4 of 5</div>
            </div>

            <!-- ================= PAGE 5: HOME SAFETY RISK ASSESSMENT, CONSENT FORM & HOUSEKEEPING ================= -->
            <div style="width:794px;min-height:1120px;padding:24px 34px;box-sizing:border-box;">
                <div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
                    <img src="InisCare-logo.png" style="height:34px;width:auto;object-fit:contain;">
                </div>

                <div style="${SEC_HEADER}">6C. Home Safety Risk Assessment</div>

                <div style="${BASE}font-weight:bold;margin:3px 0 2px 0;color:#005952;">Home Safety Room-by-Room Inspection Checklist</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;font-size:8.5px;">
                    <tr style="background:#f1f5f9;font-weight:bold;">
                        <th style="${BORDER}padding:2.2px 5px;text-align:left;width:35%;">Outside Area</th>
                        <th style="${BORDER}padding:2.2px 5px;text-align:center;width:15%;">Y / N</th>
                        <th style="${BORDER}padding:2.2px 5px;text-align:left;width:35%;">Entrance Hall</th>
                        <th style="${BORDER}padding:2.2px 5px;text-align:center;width:15%;">Y / N</th>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Parking in close proximity</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsParking')}</td>
                        <td style="${BORDER}padding:2px 5px;">Lights working</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsHallLights')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Streetlights working</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsStreetlights')}</td>
                        <td style="${BORDER}padding:2px 5px;">Door lock in working order</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsDoorLock')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Uneven paths</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsUnevenPaths')}</td>
                        <td style="${BORDER}padding:2px 5px;">Floor safe (mats/slippery/clutter)</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsHallFloor')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">House alarm</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsHouseAlarm')}</td>
                        <td colspan="2" style="${BORDER}background:#f1f5f9;font-weight:bold;padding:2px 5px;">Living Room</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Broken windows in house</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsBrokenWin')}</td>
                        <td style="${BORDER}padding:2px 5px;">Floor safe (mats/slippery/clutter)</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsLivingFloor')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Visitors visible prior to entry</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsVisitorsVisible')}</td>
                        <td style="${BORDER}padding:2px 5px;">Cables tidy</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsCablesTidy')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Entrance safe (steps/railings)</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsEntranceSafe')}</td>
                        <td style="${BORDER}padding:2px 5px;">Plugs working &amp; safe</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsPlugsSafe')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Doorbell working</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsDoorbell')}</td>
                        <td style="${BORDER}padding:2px 5px;">Lights working</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsLivingLights')}</td>
                    </tr>
                    <tr style="background:#f1f5f9;font-weight:bold;">
                        <td colspan="2" style="${BORDER}padding:2px 5px;">Kitchen</td>
                        <td style="${BORDER}padding:2px 5px;">Windows can be opened</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsLivingWin')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">All appliances working</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsKitchenAppl')}</td>
                        <td style="${BORDER}padding:2px 5px;">Favourite chair easy sit/stand</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsChairEasy')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Plugs working &amp; safe</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsKitchenPlugs')}</td>
                        <td style="${BORDER}padding:2px 5px;">Table beside chair in easy reach</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsTableReach')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Floor safe (mats/slippery/clutter)</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsKitchenFloor')}</td>
                        <td colspan="2" style="${BORDER}background:#f1f5f9;font-weight:bold;padding:2px 5px;">Bedroom</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Windows can be opened</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsKitchenWin')}</td>
                        <td style="${BORDER}padding:2px 5px;">Lights working</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsBedLights')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Pots/dishes/cutlery stored safely</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsPotsStored')}</td>
                        <td style="${BORDER}padding:2px 5px;">Floor safe (mats/slippery/clutter)</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsBedFloor')}</td>
                    </tr>
                    <tr style="background:#f1f5f9;font-weight:bold;">
                        <td colspan="2" style="${BORDER}padding:2px 5px;">Stairway ${getCheck('hsStairNA') ? '(N/A - Single Storey)' : ''}</td>
                        <td style="${BORDER}padding:2px 5px;">Cables safe &bull; Plugs safe</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsBedCables')} / ${ynBadge('hsBedPlugs')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Stairlift insitu &bull; Banister secure</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsStairlift')} / ${ynBadge('hsBanister')}</td>
                        <td style="${BORDER}padding:2px 5px;">Phone &amp; torch beside bed</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsBedPhone')} / ${ynBadge('hsBedTorch')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Stairs safe &bull; Lights working</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsStairsSafe')} / ${ynBadge('hsStairLights')}</td>
                        <td style="${BORDER}padding:2px 5px;">Bed easily accessible</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsBedAccess')}</td>
                    </tr>
                    <tr style="background:#f1f5f9;font-weight:bold;">
                        <td colspan="2" style="${BORDER}padding:2px 5px;">Bathroom</td>
                        <td colspan="2" style="${BORDER}padding:2px 5px;">General &amp; Fire Safety</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Lights working &bull; Floor safe wet</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsBathLights')} / ${ynBadge('hsBathFloor')}</td>
                        <td style="${BORDER}padding:2px 5px;">Smoke alarm &bull; Carbon monoxide</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsSmokeAlarm')} / ${ynBadge('hsCoAlarm')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Walk-in shower &bull; Bath hoist</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsBathShower')} / ${ynBadge('hsBathHoist')}</td>
                        <td style="${BORDER}padding:2px 5px;">Fire equipment present</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsFireEquip')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Windows open &bull; Transfer space</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsBathWin')} / ${ynBadge('hsBathTransfer')}</td>
                        <td style="${BORDER}padding:2px 5px;">Location of firefighting equip:</td>
                        <td style="${BORDER}padding:2px 5px;">${esc(getVal('hsFireLoc')) || '-'}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Safety mat in bath &bull; Shower chair</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsSafetyMat')} / ${ynBadge('hsShowerChair')}</td>
                        <td style="${BORDER}padding:2px 5px;">Free from odour &bull; Free from pests</td>
                        <td style="${BORDER}padding:2px 5px;text-align:center;">${ynBadge('hsNoOdour')} / ${ynBadge('hsNoPests')}</td>
                    </tr>
                    <tr>
                        <td style="${BORDER}padding:2px 5px;">Bathroom comments:</td>
                        <td style="${BORDER}padding:2px 5px;">${esc(getVal('hsBathComments')) || '-'}</td>
                        <td style="${BORDER}padding:2px 5px;">Post &amp; Bins accessible &bull; Fuse box:</td>
                        <td style="${BORDER}padding:2px 5px;">${ynBadge('hsPostAccess')}/${ynBadge('hsBinsAccess')} &bull; ${esc(getVal('hsFuseBoxLoc')) || '-'}</td>
                    </tr>
                </table>

                <div style="${BASE}font-weight:bold;margin:4px 0 3px 0;color:#005952;">Home Safety Risk Management Action Plan</div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:2.5px 5px;font-size:9px;">Office: <strong>${esc(getVal('safetyOffice'))}</strong></td>
                        <td style="${BASE}${YELLOW}${BORDER}width:20%;padding:2.5px 5px;font-size:9px;">Source: <strong>${esc(getVal('safetySource'))}</strong></td>
                        <td style="${BASE}${YELLOW}${BORDER}width:35%;padding:2.5px 5px;font-size:9px;">Client: <strong>${esc(getVal('safetyCustName'))}</strong></td>
                        <td style="${BASE}${YELLOW}${BORDER}width:25%;padding:2.5px 5px;font-size:9px;">Date: <strong>${esc(getVal('safetyDate'))}</strong></td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.5px 5px;font-weight:bold;font-size:9px;">Hazard Description:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">${esc(getVal('safetyHazard'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.5px 5px;font-weight:bold;font-size:9px;">Existing Controls:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">${esc(getVal('safetyExistingControls'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.5px 5px;font-weight:bold;font-size:9px;">Additional Controls:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">${esc(getVal('safetyAdditionalControls'))}</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.5px 5px;font-size:9px;">Owner &amp; Dates:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">
                            Owner: <strong>${esc(getVal('safetyOwner'))}</strong> &bull; Due: <strong>${esc(getVal('safetyDueDate'))}</strong> &bull; Review: <strong>${esc(getVal('safetyReviewDate'))}</strong> &bull; Status: <strong>${esc(getRadio('safetyStatus') || 'Open')}</strong>
                        </td>
                    </tr>
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}padding:2.5px 5px;font-weight:bold;font-size:9px;">Calculated Rating:</td>
                        <td colspan="3" style="${BASE}${BORDER}padding:2.5px 5px;background:#f0fdf4;font-size:9px;">
                            Likelihood: <strong>${esc(getVal('safetyLikelihood'))}</strong> &times; Impact: <strong>${esc(getVal('safetyImpact'))}</strong> = 
                            <strong style="color:#166534;font-size:11px;"> ${parseInt(getVal('safetyLikelihood')||1)*parseInt(getVal('safetyImpact')||1)}</strong>
                        </td>
                    </tr>
                </table>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <div>Signed Assessor: <strong>${esc(getVal('safetyPrintName'))}</strong> &bull; Date: <strong>${esc(getVal('safetySigDate'))}</strong></div>
                    <div>${sigHtml(safetySigUrl)}</div>
                </div>

                <div style="${SEC_HEADER}">7. Consent Form</div>
                <div style="${BASE}font-size:9px;margin-bottom:3px;">
                    I, <strong>${esc(getVal('consentGiverName') || getVal('custName') || 'the undersigned')}</strong>, am giving my consent for the following:
                </div>
                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;margin-bottom:6px;">
                    <tr>
                        <td style="${BASE}${BORDER}width:24px;text-align:center;">${checkMark(getCheck('cConsentCare'))}</td>
                        <td style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">Consent to care delivered by InisCare HCAs</td>
                        <td style="${BASE}${BORDER}width:24px;text-align:center;">${checkMark(getCheck('cConsentHse'))}</td>
                        <td style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">Consent to info sharing (HSE, PHN, GP)</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${BORDER}text-align:center;">${checkMark(getCheck('cConsentMeds'))}</td>
                        <td style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">Consent to medication prompts</td>
                        <td style="${BASE}${BORDER}text-align:center;">${checkMark(getCheck('cConsentPlan'))}</td>
                        <td style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">Agree with care plan &amp; risk rating</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${BORDER}text-align:center;">${checkMark(getCheck('cConsentKeybox'))}</td>
                        <td style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">Keybox access (Code: ${esc(getVal('consentKeyboxVal'))})</td>
                        <td style="${BASE}${BORDER}text-align:center;">${checkMark(getCheck('cConsentMale'))}</td>
                        <td style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">Consent for male care assistants</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${BORDER}text-align:center;">${checkMark(getCheck('cConsentNok'))}</td>
                        <td style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">Discuss care with NOK: ${esc(getVal('consentNokVal'))}</td>
                        <td style="${BASE}${BORDER}text-align:center;">${checkMark(getCheck('cConsentBsl'))}</td>
                        <td style="${BASE}${BORDER}padding:2.5px 5px;font-size:9px;">Assist with blood sugar level testing</td>
                    </tr>
                </table>

                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:8px;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:50%;padding:4px 6px;font-size:9.5px;font-weight:bold;">Customer / NOK Signature</td>
                        <td style="${BASE}${YELLOW}${BORDER}width:50%;padding:4px 6px;font-size:9.5px;font-weight:bold;">InisCare Representative Signature</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${BORDER}padding:6px 8px;vertical-align:bottom;height:75px;box-sizing:border-box;">
                            <div style="min-height:48px;display:flex;align-items:flex-end;">
                                ${sigHtml(consentClientSigUrl, 48)}
                            </div>
                            <div style="font-size:8.5px;margin-top:4px;border-top:1px solid #e2e8f0;padding-top:3px;">Date: <strong>${esc(getVal('consentClientSigDate'))}</strong></div>
                        </td>
                        <td style="${BASE}${BORDER}padding:6px 8px;vertical-align:bottom;height:75px;box-sizing:border-box;">
                            <div style="min-height:48px;display:flex;align-items:flex-end;">
                                ${sigHtml(consentRepSigUrl, 48)}
                            </div>
                            <div style="font-size:8.5px;margin-top:4px;border-top:1px solid #e2e8f0;padding-top:3px;">
                                Name: <strong>${esc(getVal('consentRepName'))}</strong> &bull; 
                                Title: <strong>${esc(getVal('consentRepTitle'))}</strong> &bull; 
                                Date: <strong>${esc(getVal('consentRepDate'))}</strong>
                            </div>
                        </td>
                    </tr>
                </table>

                <div style="${SEC_HEADER}">8. Housekeeping Scope Agreement</div>
                <div style="${BASE}font-size:8.5px;margin-bottom:3px;line-height:1.25;color:#333;">
                    InisCare staff are professional Healthcare Assistants dedicated to supporting safe independent living, not domestic cleaners.
                </div>

                <div style="display:flex;gap:6px;margin-bottom:6px;">
                    <div style="flex:1;border:0.5px solid #86efac;background:#f0fdf4;padding:4px 6px;border-radius:2px;">
                        <strong style="color:#166534;font-size:8.5px;">&#10003; Permitted Light Housekeeping Tasks:</strong>
                        <ul style="margin:2px 0 0 12px;padding:0;font-size:8px;line-height:1.25;color:#166534;">
                            <li>Hoovering rooms used by Customer (weekly / as needed)</li>
                            <li>Washing up used dishes &amp; kitchen countertops</li>
                            <li>Personal laundry (Customer clothing only)</li>
                            <li>Mopping kitchen/bathroom floors</li>
                            <li>Cleaning bathroom after use (shower, bath, toilet)</li>
                            <li>Making bed, changing sheets &amp; emptying bins</li>
                        </ul>
                    </div>
                    <div style="flex:1;border:0.5px solid #fca5a5;background:#fff5f5;padding:4px 6px;border-radius:2px;">
                        <strong style="color:#991b1b;font-size:8.5px;">&#10007; Strictly Excluded Tasks:</strong>
                        <ul style="margin:2px 0 0 12px;padding:0;font-size:8px;line-height:1.25;color:#991b1b;">
                            <li>Gardening &amp; outdoor maintenance</li>
                            <li>Deep cleaning (ovens, cupboards, windows, walls)</li>
                            <li>Moving heavy furniture / ladders / cobwebs</li>
                            <li>Painting, decorating &amp; private wardrobes</li>
                            <li>Defrosting freezers / washing machine repair</li>
                        </ul>
                    </div>
                </div>

                <table style="${BASE}${BORDER}width:100%;border-collapse:collapse;table-layout:fixed;">
                    <tr>
                        <td style="${BASE}${YELLOW}${BORDER}width:50%;padding:4px 6px;font-size:9.5px;font-weight:bold;">Signed Customer / NOK</td>
                        <td style="${BASE}${YELLOW}${BORDER}width:50%;padding:4px 6px;font-size:9.5px;font-weight:bold;">Signed InisCare Representative</td>
                    </tr>
                    <tr>
                        <td style="${BASE}${BORDER}padding:6px 8px;vertical-align:bottom;height:75px;box-sizing:border-box;">
                            <div style="min-height:48px;display:flex;align-items:flex-end;">
                                ${sigHtml(hkClientSigUrl, 48)}
                            </div>
                            <div style="font-size:8.5px;margin-top:4px;border-top:1px solid #e2e8f0;padding-top:3px;">Date: <strong>${esc(getVal('hkClientSigDate'))}</strong></div>
                        </td>
                        <td style="${BASE}${BORDER}padding:6px 8px;vertical-align:bottom;height:75px;box-sizing:border-box;">
                            <div style="min-height:48px;display:flex;align-items:flex-end;">
                                ${sigHtml(hkRepSigUrl, 48)}
                            </div>
                            <div style="font-size:8.5px;margin-top:4px;border-top:1px solid #e2e8f0;padding-top:3px;">
                                Name: <strong>${esc(getVal('hkRepName'))}</strong> &bull; 
                                Title: <strong>${esc(getVal('hkRepTitle'))}</strong> &bull; 
                                Date: <strong>${esc(getVal('hkRepDate'))}</strong>
                            </div>
                        </td>
                    </tr>
                </table>

                <div style="text-align:right;font-size:9px;color:#777;margin-top:8px;">InisCare PSP &bull; Page 5 of 5 &bull; Fully Signed &amp; Audited</div>
            </div>

        </div>`;

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.zIndex = '-1000';
        container.innerHTML = pagesHtml;
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
    async function buildPspPdfBlob() {
        const clientVal = (custName?.value || '').trim();
        const clientPart = clientVal ? clientVal.replace(/\s+/g, '_') : 'Blank_Draft';
        const dateVal = formattedToday.replace(/\//g, '-');
        const fileName = `Personal_Support_Plan_${clientPart}_${dateVal}.pdf`;
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
                const clientVal = (custName?.value || '').trim() || 'Blank Draft';
                const res = await buildPspPdfBlob();
                if (res) {
                    if (window.deliverPdf) {
                        await window.deliverPdf({
                            pdfBlob: res.blob,
                            fileName: res.fileName,
                            formType: 'Personal Support Plan (PSP)',
                            targetEmail: (targetEmail ? targetEmail.value.trim() : ''),
                            metadata: {
                                'Service User': clientVal,
                                'Address': (document.getElementById('custAddress')?.value || '').trim() || 'N/A',
                                'Date': formattedToday
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
                    console.log('✅ PSP PDF sent in background:', data);
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
                const clientVal = (document.getElementById('serviceUserName')?.value || '').trim() || 'Client';
                const res = await buildPspPdfBlob();
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
                            formType: 'Personal Support Plan (PSP)',
                            pdfBase64: base64data,
                            fileName: res.fileName,
                            metadata: {
                                'Service User': clientVal,
                                'Address': (document.getElementById('serviceUserAddress')?.value || '').trim() || 'N/A',
                                'Date': formattedToday,
                                'Recipient': email
                            }
                        })
                    });

                    const data = await response.json();
                    if (response.ok && data.success) {
                        alert(`Personal Support Plan successfully sent to ${email}!`);
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

    // ========================================================
    // LOCAL STORAGE PERSISTENCE (SAVE & CLEAN FORM)
    // ========================================================
    const btnSaveLocal = document.getElementById('btnSaveLocal');
    const btnClearLocal = document.getElementById('btnClearLocal');
    const draftStatusEl = document.getElementById('localDraftStatus');
    const DRAFT_KEY = 'iniscare_psp_saved_draft';

    function escAttr(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function updateDraftStatus(msg, type = 'info') {
        if (!draftStatusEl) return;
        draftStatusEl.textContent = msg;
        draftStatusEl.className = `local-draft-status ${type}`;
    }

    function saveLocalDraft(isManual = false) {
        try {
            const fields = {};
            document.querySelectorAll('#pspDocument input[id]').forEach(input => {
                if (input.type !== 'radio' && input.type !== 'checkbox') {
                    fields[input.id] = input.value;
                }
            });

            const textareas = {};
            document.querySelectorAll('#pspDocument textarea[id]').forEach(ta => {
                textareas[ta.id] = ta.value;
            });

            const selects = {};
            document.querySelectorAll('#pspDocument select[id]').forEach(sel => {
                selects[sel.id] = sel.value;
            });

            const checkboxes = {};
            document.querySelectorAll('#pspDocument input[type="checkbox"][id]').forEach(cb => {
                checkboxes[cb.id] = cb.checked;
            });

            const radios = {};
            document.querySelectorAll('#pspDocument input[type="radio"]:checked').forEach(rb => {
                radios[rb.name] = rb.value;
            });

            const regMeds = [];
            document.querySelectorAll('#regMedBody tr').forEach(tr => {
                const name = tr.querySelector('.med-name')?.value || '';
                const dose = tr.querySelector('.med-dose')?.value || '';
                const freq = tr.querySelector('.med-freq')?.value || '';
                if (name || dose || freq) {
                    regMeds.push({ name, dose, freq });
                }
            });

            const shortMeds = [];
            document.querySelectorAll('#shortMedBody tr').forEach(tr => {
                const name = tr.querySelector('.short-name')?.value || '';
                const reason = tr.querySelector('.short-reason')?.value || '';
                const start = tr.querySelector('.short-start')?.value || '';
                const end = tr.querySelector('.short-end')?.value || '';
                if (name || reason || start || end) {
                    shortMeds.push({ name, reason, start, end });
                }
            });

            const signatures = {
                adl: (adlPad && !adlPad.isEmpty()) ? adlPad.toData() : null,
                pmh: (pmhPad && !pmhPad.isEmpty()) ? pmhPad.toData() : null,
                falls: (fallsPad && !fallsPad.isEmpty()) ? fallsPad.toData() : null,
                safety: (safetyPad && !safetyPad.isEmpty()) ? safetyPad.toData() : null,
                consentClient: (consentClientPad && !consentClientPad.isEmpty()) ? consentClientPad.toData() : null,
                consentRep: (consentRepPad && !consentRepPad.isEmpty()) ? consentRepPad.toData() : null,
                hkClient: (hkClientPad && !hkClientPad.isEmpty()) ? hkClientPad.toData() : null,
                hkRep: (hkRepPad && !hkRepPad.isEmpty()) ? hkRepPad.toData() : null
            };

            const draft = {
                savedAt: new Date().toISOString(),
                targetEmail: targetEmail ? targetEmail.value : '',
                fields,
                textareas,
                selects,
                checkboxes,
                radios,
                regMeds,
                shortMeds,
                signatures
            };

            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            updateDraftStatus(isManual ? `Form saved locally at ${nowTime}` : `Auto-saved at ${nowTime}`, 'success');
            return true;
        } catch (err) {
            console.error('Failed to save draft:', err);
            updateDraftStatus('Error saving locally (storage full?)', 'danger');
            return false;
        }
    }

    function loadLocalDraft() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (!data) return false;

            // Restore text, date, time inputs
            if (data.fields) {
                Object.entries(data.fields).forEach(([id, val]) => {
                    const el = document.getElementById(id);
                    if (el && el.type !== 'radio' && el.type !== 'checkbox') {
                        el.value = val;
                    }
                });
            }

            // Restore textareas
            if (data.textareas) {
                Object.entries(data.textareas).forEach(([id, val]) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val;
                });
            }

            // Restore selects
            if (data.selects) {
                Object.entries(data.selects).forEach(([id, val]) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val;
                });
            }

            // Restore checkboxes
            if (data.checkboxes) {
                Object.entries(data.checkboxes).forEach(([id, checked]) => {
                    const el = document.getElementById(id);
                    if (el && el.type === 'checkbox') {
                        el.checked = !!checked;
                    }
                });
            }

            // Restore radio buttons
            if (data.radios) {
                Object.entries(data.radios).forEach(([name, val]) => {
                    if (val) {
                        const radio = document.querySelector(`input[name="${name}"][value="${val}"]`);
                        if (radio) radio.checked = true;
                    }
                });
            }

            // Restore regular medications
            if (Array.isArray(data.regMeds) && regMedBody && data.regMeds.length > 0) {
                regMedBody.innerHTML = '';
                data.regMeds.forEach(m => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><input type="text" class="table-input med-name" placeholder="Medication name" value="${escAttr(m.name || '')}"></td>
                        <td><input type="text" class="table-input med-dose" placeholder="Dose" value="${escAttr(m.dose || '')}"></td>
                        <td><input type="text" class="table-input med-freq" placeholder="Frequency" value="${escAttr(m.freq || '')}"></td>
                        <td style="text-align: center;"><button type="button" class="btn-del-row" onclick="removeMedRow(this)">&times;</button></td>
                    `;
                    regMedBody.appendChild(tr);
                });
            }

            // Restore short medications
            if (Array.isArray(data.shortMeds) && shortMedBody && data.shortMeds.length > 0) {
                shortMedBody.innerHTML = '';
                data.shortMeds.forEach(m => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><input type="text" class="table-input short-name" placeholder="Medication name" value="${escAttr(m.name || '')}"></td>
                        <td><input type="text" class="table-input short-reason" placeholder="Reason" value="${escAttr(m.reason || '')}"></td>
                        <td><input type="text" class="table-input short-start" placeholder="DD/MM/YY" value="${escAttr(m.start || '')}"></td>
                        <td><input type="text" class="table-input short-end" placeholder="DD/MM/YY" value="${escAttr(m.end || '')}"></td>
                        <td style="text-align: center;"><button type="button" class="btn-del-row" onclick="removeMedRow(this)">&times;</button></td>
                    `;
                    shortMedBody.appendChild(tr);
                });
            }

            // Target email
            if (data.targetEmail && targetEmail) {
                targetEmail.value = data.targetEmail;
            }

            // Restore Signatures
            if (data.signatures) {
                setTimeout(() => {
                    if (data.signatures.adl && adlPad) adlPad.fromData(data.signatures.adl);
                    if (data.signatures.pmh && pmhPad) pmhPad.fromData(data.signatures.pmh);
                    if (data.signatures.falls && fallsPad) fallsPad.fromData(data.signatures.falls);
                    if (data.signatures.safety && safetyPad) safetyPad.fromData(data.signatures.safety);
                    if (data.signatures.consentClient && consentClientPad) consentClientPad.fromData(data.signatures.consentClient);
                    if (data.signatures.consentRep && consentRepPad) consentRepPad.fromData(data.signatures.consentRep);
                    if (data.signatures.hkClient && hkClientPad) hkClientPad.fromData(data.signatures.hkClient);
                    if (data.signatures.hkRep && hkRepPad) hkRepPad.fromData(data.signatures.hkRep);
                }, 120);
            }

            // Recalculate risk matrices
            ['pmh', 'falls', 'safety'].forEach(p => {
                if (window.calculateRisk) window.calculateRisk(p);
            });

            const clientName = data.fields?.custName ? ` (Client: ${data.fields.custName})` : '';
            const savedTime = data.savedAt ? ` saved at ${new Date(data.savedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : '';
            updateDraftStatus(`Loaded saved draft${clientName}${savedTime}. Click "Clean Form" to start a new customer.`, 'info');
            return true;
        } catch (err) {
            console.error('Error loading local draft:', err);
            return false;
        }
    }

    function clearLocalDraft() {
        const confirmMsg = "Are you sure you want to clean the entire form?\n\nThis will erase all current fields, signatures, and the saved draft from this device so you can start a new customer.";
        if (!confirm(confirmMsg)) return;

        localStorage.removeItem(DRAFT_KEY);

        // Reset all inputs & textareas
        document.querySelectorAll('#pspDocument input[type="text"], #pspDocument input[type="email"], #pspDocument input[type="date"], #pspDocument input[type="time"], #pspDocument input[type="number"]').forEach(el => {
            el.value = '';
        });
        document.querySelectorAll('#pspDocument textarea').forEach(el => {
            el.value = '';
        });
        document.querySelectorAll('#pspDocument input[type="checkbox"]').forEach(el => {
            el.checked = false;
        });
        document.querySelectorAll('#pspDocument input[type="radio"]').forEach(el => {
            el.checked = false;
        });

        // Reset dynamic medication rows to 1 empty row
        if (regMedBody) {
            regMedBody.innerHTML = `
                <tr>
                    <td><input type="text" class="table-input med-name" placeholder="Medication name"></td>
                    <td><input type="text" class="table-input med-dose" placeholder="Dose"></td>
                    <td><input type="text" class="table-input med-freq" placeholder="Frequency"></td>
                    <td style="text-align: center;"><button type="button" class="btn-del-row" onclick="removeMedRow(this)">&times;</button></td>
                </tr>`;
        }
        if (shortMedBody) {
            shortMedBody.innerHTML = `
                <tr>
                    <td><input type="text" class="table-input short-name" placeholder="Medication name"></td>
                    <td><input type="text" class="table-input short-reason" placeholder="Reason"></td>
                    <td><input type="text" class="table-input short-start" placeholder="DD/MM/YY"></td>
                    <td><input type="text" class="table-input short-end" placeholder="DD/MM/YY"></td>
                    <td style="text-align: center;"><button type="button" class="btn-del-row" onclick="removeMedRow(this)">&times;</button></td>
                </tr>`;
        }

        // Clear signature pads
        if (adlPad) adlPad.clear();
        if (pmhPad) pmhPad.clear();
        if (fallsPad) fallsPad.clear();
        if (safetyPad) safetyPad.clear();
        if (consentClientPad) consentClientPad.clear();
        if (consentRepPad) consentRepPad.clear();
        if (hkClientPad) hkClientPad.clear();
        if (hkRepPad) hkRepPad.clear();

        // Re-populate default dates
        if (custAssessDate) custAssessDate.value = formattedToday;
        ['pmhDate', 'pmhSigDate', 'fallsDate', 'fallsSigDate', 'safetyDate', 'safetySigDate', 'adlSigDate', 'consentClientSigDate', 'consentRepDate', 'hkClientSigDate', 'hkRepDate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = formattedToday;
        });

        // Recalculate risks
        ['pmh', 'falls', 'safety'].forEach(p => {
            if (window.calculateRisk) window.calculateRisk(p);
        });

        updateDraftStatus('Form and draft cleared. Ready for new customer.', 'info');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Attach button listeners
    if (btnSaveLocal) {
        btnSaveLocal.addEventListener('click', (e) => {
            e.preventDefault();
            saveLocalDraft(true);
        });
    }

    if (btnClearLocal) {
        btnClearLocal.addEventListener('click', (e) => {
            e.preventDefault();
            clearLocalDraft();
        });
    }

    // Debounced Auto-save on user input
    let autoSaveTimer = null;
    function triggerAutoSave() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveLocalDraft(false);
        }, 1200);
    }

    const docEl = document.getElementById('pspDocument');
    if (docEl) {
        docEl.addEventListener('input', triggerAutoSave);
        docEl.addEventListener('change', triggerAutoSave);
    }

    // Attempt to restore saved draft on initial page load
    loadLocalDraft();
});
