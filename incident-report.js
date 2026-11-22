/**
 * InisCare Incident Report Form Controller
 * Multi-page A4 Portrait PDF Export (Pages 1 to 5)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Top-level action buttons & inputs
    const btnDownload = document.getElementById('btnDownloadPdf');
    const btnEmail = document.getElementById('btnSendEmail');
    const targetEmail = document.getElementById('targetEmail');
    const btnSaveLocal = document.getElementById('btnSaveLocal');
    const btnClearLocal = document.getElementById('btnClearLocal');
    const localDraftStatus = document.getElementById('localDraftStatus');

    // Date formatting (DD/MM/YYYY)
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const formattedTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    const formattedDateTime = `${formattedDate} - ${formattedTime}`;

    // Auto-populate default dates/times if empty
    const repDateTime = document.getElementById('repDateTime');
    if (repDateTime && !repDateTime.value) repDateTime.value = formattedDateTime;

    const reporterSigDate = document.getElementById('reporterSigDate');
    if (reporterSigDate && !reporterSigDate.value) reporterSigDate.value = formattedDate;

    const mgrSigDate = document.getElementById('mgrSigDate');
    if (mgrSigDate && !mgrSigDate.value) mgrSigDate.value = formattedDate;

    // Initialize Signature Pads
    let padReporter = null;
    let padManager = null;

    const canvasReporter = document.getElementById('sigReporter');
    if (canvasReporter) {
        padReporter = new SignaturePad(canvasReporter, { backgroundColor: 'rgb(255, 255, 255)', penColor: '#0b2545' });
        const btnClear = document.getElementById('btnClearSigReporter');
        if (btnClear) btnClear.addEventListener('click', () => padReporter.clear());
    }

    const canvasManager = document.getElementById('sigManager');
    if (canvasManager) {
        padManager = new SignaturePad(canvasManager, { backgroundColor: 'rgb(255, 255, 255)', penColor: '#0b2545' });
        const btnClear = document.getElementById('btnClearSigManager');
        if (btnClear) btnClear.addEventListener('click', () => padManager.clear());
    }

    // Helper: resize canvas cleanly for high DPI screens
    function resizeCanvas(canvas, pad) {
        if (!canvas || !pad) return;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const w = canvas.offsetWidth || 380;
        const h = canvas.offsetHeight || 110;
        if (canvas.width !== w * ratio || canvas.height !== h * ratio) {
            const data = pad.toData();
            canvas.width = w * ratio;
            canvas.height = h * ratio;
            const ctx = canvas.getContext('2d');
            ctx.scale(ratio, ratio);
            pad.clear();
            pad.fromData(data);
        }
    }

    setTimeout(() => {
        resizeCanvas(canvasReporter, padReporter);
        resizeCanvas(canvasManager, padManager);
    }, 250);

    // Helpers to get value
    const v = (id) => (document.getElementById(id)?.value || '').trim();
    const chk = (id) => document.getElementById(id)?.checked || false;
    const radio = (name) => {
        const checked = document.querySelector(`input[name="${name}"]:checked`);
        return checked ? checked.value : '';
    };

    const escapeHtml = (str) => {
        if (!str) return '&nbsp;';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/\n/g, '<br>');
    };

    const renderBox = (val, minHeight = '140px') => `
        <div style="border: 0.6px solid #444; border-radius: 4px; padding: 8px 10px; min-height: ${minHeight}; background: #fff; font-size: 11px; line-height: 1.45; color: #1e293b; box-sizing: border-box;">
            ${escapeHtml(val)}
        </div>
    `;

    const renderTick = (isChecked) => isChecked 
        ? `<span style="display:inline-block;width:14px;height:14px;border:1px solid #005952;background:#005952;color:#fff;text-align:center;line-height:13px;font-size:10px;font-weight:bold;border-radius:2px;">&#10003;</span>` 
        : `<span style="display:inline-block;width:14px;height:14px;border:1px solid #888;background:#fff;border-radius:2px;"></span>`;

    const renderYnBadge = (val) => {
        if (!val) {
            return '<span style="font-weight: 600; color: #1e293b; font-size: 11px;">Yes / No</span>';
        }
        const isYes = String(val).toLowerCase() === 'yes';
        if (isYes) {
            return '<span style="display:inline-block;padding:2px 7px;border-radius:3px;background:#dcfce7;color:#166534;font-weight:bold;font-size:10.5px;border:1px solid #166534;">Yes</span><span style="color:#94a3b8;font-size:10px;margin-left:3px;"> / No</span>';
        } else {
            return '<span style="color:#94a3b8;font-size:10px;margin-right:3px;">Yes / </span><span style="display:inline-block;padding:2px 7px;border-radius:3px;background:#fee2e2;color:#991b1b;font-weight:bold;font-size:10.5px;border:1px solid #991b1b;">No</span>';
        }
    };

    const renderSig = (pad) => {
        if (pad && !pad.isEmpty()) {
            return `<img src="${pad.toDataURL('image/png')}" style="max-height: 48px; max-width: 170px; display: block;" alt="Signature">`;
        }
        return `<span style="font-style: italic; color: #94a3b8; font-size: 10px;">(Pending Signature)</span>`;
    };

    // Build 5-page A4 PDF Container
    async function buildPdfContainer() {
        const pageStyle = `
            width: 794px;
            min-height: 1120px;
            box-sizing: border-box;
            padding: 24px 34px;
            background: #ffffff;
            page-break-after: always;
            position: relative;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
        `;

        const headerHtml = `
            <div style="text-align: center; margin-bottom: 12px;">
                <img src="InisCare-logo.png" style="max-height: 52px; width: auto; display: inline-block;" alt="InisCare">
            </div>
        `;

        const confidentialityNoticeHtml = `
            <div style="font-size: 9.5px; font-weight: 600; font-style: italic; color: #c0392b; text-align: center; margin-top: 10px;">
                Confidentiality Notice: Contains sensitive personal data subject to GDPR and the Data Protection Act 2018.
            </div>
        `;

        const tableStyle = `width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; border: 0.6px solid #444;`;
        const tdYellowHeader = `background-color: #f9e493; color: #000000; font-weight: 700; padding: 5px 8px; border: 0.6px solid #444;`;
        const tdYellowSub = `background-color: #fdf5d3; color: #1e293b; font-weight: 600; padding: 4px 8px; border: 0.6px solid #444;`;
        const tdCell = `padding: 4px 8px; border: 0.6px solid #444; vertical-align: middle;`;

        // ==========================================
        // PAGE 1: Administrative, Individuals, Category
        // ==========================================
        const page1Html = `
            <div style="${pageStyle}">
                ${headerHtml}
                <div style="background-color: #005952; color: #ffffff; text-align: center; font-size: 16px; font-weight: 700; padding: 7px 12px; margin-bottom: 14px; border-radius: 2px; font-family: 'Outfit', sans-serif;">
                    Incident Report Form
                </div>

                <!-- 1. Administrative Details -->
                <table style="${tableStyle}">
                    <thead>
                        <tr><th colspan="2" style="${tdYellowHeader} font-size: 12px; text-align: left;">Administrative Details</th></tr>
                        <tr>
                            <th style="${tdYellowSub} width: 34%; text-align: left;">Field</th>
                            <th style="${tdYellowSub} width: 66%; text-align: left;">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style="${tdYellowSub}">Date &amp; Time of Incident</td><td style="${tdCell}">${escapeHtml(v('incDateTime'))}</td></tr>
                        <tr><td style="${tdYellowSub}">Date &amp; Time Report Completed</td><td style="${tdCell}">${escapeHtml(v('repDateTime'))}</td></tr>
                        <tr><td style="${tdYellowSub}">Location of Incident</td><td style="${tdCell}">${escapeHtml(v('incLocation'))}</td></tr>
                        <tr><td style="${tdYellowSub}">Full Address of Incident</td><td style="${tdCell}">${escapeHtml(v('incAddress'))}</td></tr>
                        <tr><td style="${tdYellowSub}">Person Completing Form</td><td style="${tdCell}">${escapeHtml(v('personCompleting'))}</td></tr>
                        <tr><td style="${tdYellowSub}">InisCare Office</td><td style="${tdCell}">${escapeHtml(v('inisCareOffice'))}</td></tr>
                    </tbody>
                </table>

                <!-- 2. Individuals Involved -->
                <table style="${tableStyle}">
                    <thead>
                        <tr><th colspan="2" style="${tdYellowHeader} font-size: 12px; text-align: left;">Individuals Involved</th></tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="2" style="${tdYellowSub} text-align: center;">Employee Details</td></tr>
                        <tr><td style="${tdCell} width: 34%; font-weight: 500;">Name</td><td style="${tdCell}">${escapeHtml(v('empName'))}</td></tr>
                        <tr><td style="${tdCell} font-weight: 500;">Job Title</td><td style="${tdCell}">${escapeHtml(v('empJobTitle'))}</td></tr>

                        <tr><td colspan="2" style="${tdYellowSub} text-align: center;">Client Details</td></tr>
                        <tr><td style="${tdCell} font-weight: 500;">Full Name</td><td style="${tdCell}">${escapeHtml(v('clientFullName'))}</td></tr>

                        <tr><td colspan="2" style="${tdYellowSub} text-align: center;">Others Involved</td></tr>
                        <tr><td style="${tdCell} font-weight: 500;">Name</td><td style="${tdCell}">${escapeHtml(v('otherName'))}</td></tr>
                        <tr><td style="${tdCell} font-weight: 500;">Role</td><td style="${tdCell}">${escapeHtml(v('otherRole'))}</td></tr>
                    </tbody>
                </table>

                <!-- 3. Incident Category -->
                <table style="${tableStyle}">
                    <thead>
                        <tr><th colspan="2" style="${tdYellowHeader} font-size: 12px; text-align: left;">Incident Category</th></tr>
                        <tr><th colspan="2" style="background:#fff; text-align:left; font-weight:normal; font-style:italic; font-size:10px; padding:3px 8px; border:0.6px solid #444;">(Select all primary categories that apply)</th></tr>
                    </thead>
                    <tbody>
                        <tr><td style="${tdCell}">Client Fall / Trip (Level ground, bed transfer, shower transfer)</td><td style="${tdCell} width: 44px; text-align: center;">${renderTick(chk('cat_fall'))}</td></tr>
                        <tr><td style="${tdCell}">Medication Incident (Omission, wrong dose, wrong time, administration error)</td><td style="${tdCell} text-align: center;">${renderTick(chk('cat_med'))}</td></tr>
                        <tr><td style="${tdCell}">Pressure Injury / Skin Tear (New breakdown or sudden deterioration)</td><td style="${tdCell} text-align: center;">${renderTick(chk('cat_skin'))}</td></tr>
                        <tr><td style="${tdCell}">Client Illness / Deterioration (Sudden collapse, choking, acute distress)</td><td style="${tdCell} text-align: center;">${renderTick(chk('cat_illness'))}</td></tr>
                        <tr><td style="${tdCell}">Safeguarding / Allegation (Suspected physical, financial, emotional abuse/neglect)</td><td style="${tdCell} text-align: center;">${renderTick(chk('cat_safeguarding'))}</td></tr>
                        <tr><td style="${tdCell}">Staff Health &amp; Safety (Manual handling injury, needle stick, aggression/abuse)</td><td style="${tdCell} text-align: center;">${renderTick(chk('cat_hns'))}</td></tr>
                        <tr><td style="${tdCell}">Property / Equipment (Hoist failure, broken mobility aid, missing keys/access)</td><td style="${tdCell} text-align: center;">${renderTick(chk('cat_property'))}</td></tr>
                        <tr><td style="${tdCell}">No Show (Health Care assistant failed to attend call with no notice give)</td><td style="${tdCell} text-align: center;">${renderTick(chk('cat_noshow'))}</td></tr>
                    </tbody>
                </table>

                ${confidentialityNoticeHtml}
                <div style="text-align:right; font-size:9px; color:#64748b; margin-top:8px;">InisCare Incident Report &bull; Page 1 of 5</div>
            </div>
        `;

        // ==========================================
        // PAGE 2: Description & Immediate Action
        // ==========================================
        const page2Html = `
            <div style="${pageStyle}">
                ${headerHtml}
                
                <div style="margin-bottom: 18px;">
                    <div style="font-weight: 700; font-size: 12px; color: #0b2545; margin-bottom: 2px;">
                        Factual Description of Event &amp; Immediate Action
                    </div>
                    <div style="font-size: 10px; color: #555; font-style: italic; margin-bottom: 6px;">
                        (Describe chronologically and objectively. Include exact sequence, equipment involved, and observable facts. Do not speculate.)
                    </div>
                    ${renderBox(v('eventDescription'), '380px')}
                </div>

                <div style="margin-bottom: 18px;">
                    <div style="font-weight: 700; font-size: 12px; color: #0b2545; margin-bottom: 2px;">
                        Immediate Action Taken
                    </div>
                    <div style="font-size: 10px; color: #555; font-style: italic; margin-bottom: 6px;">
                        (Detail immediate first aid, medical care provided, environment made safe, etc.)
                    </div>
                    ${renderBox(v('immediateAction'), '380px')}
                </div>

                ${confidentialityNoticeHtml}
                <div style="text-align:right; font-size:9px; color:#64748b; margin-top:8px;">InisCare Incident Report &bull; Page 2 of 5</div>
            </div>
        `;

        // ==========================================
        // PAGE 3: Contacts, Injuries & Certification
        // ==========================================
        const page3Html = `
            <div style="${pageStyle}">
                ${headerHtml}

                <!-- External Emergency Contact Log -->
                <table style="${tableStyle}">
                    <thead>
                        <tr><th colspan="4" style="${tdYellowHeader} font-size: 12px; text-align: left;">External Emergency Contact Log</th></tr>
                        <tr>
                            <th style="${tdYellowSub} width: 34%; text-align: left;">Individual Contacted</th>
                            <th style="${tdYellowSub} width: 22%; text-align: center;">Contacted?</th>
                            <th style="${tdYellowSub} width: 18%; text-align: center;">Time</th>
                            <th style="${tdYellowSub} width: 26%; text-align: left;">Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="${tdCell}">Emergency Services (112/999)</td>
                            <td style="${tdCell} text-align: center;">${renderYnBadge(radio('emgContacted'))}</td>
                            <td style="${tdCell} text-align: center;">${escapeHtml(v('emgTime'))}</td>
                            <td style="${tdCell}">${escapeHtml(v('emgName'))}</td>
                        </tr>
                        <tr>
                            <td style="${tdCell}">GP / SouthDoc / DDoc</td>
                            <td style="${tdCell} text-align: center;">${renderYnBadge(radio('gpContacted'))}</td>
                            <td style="${tdCell} text-align: center;">${escapeHtml(v('gpTime'))}</td>
                            <td style="${tdCell}">${escapeHtml(v('gpName'))}</td>
                        </tr>
                        <tr>
                            <td style="${tdCell}">NOK / Next of Kin</td>
                            <td style="${tdCell} text-align: center;">${renderYnBadge(radio('nokContacted'))}</td>
                            <td style="${tdCell} text-align: center;">${escapeHtml(v('nokTime'))}</td>
                            <td style="${tdCell}">${escapeHtml(v('nokName'))}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Additional Details -->
                <table style="${tableStyle}">
                    <thead>
                        <tr><th colspan="2" style="${tdYellowHeader} font-size: 12px; text-align: left;">Additional Details</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="${tdCell} width: 44%; font-weight: 500;">Did the customer receive any injury (Please give details)</td>
                            <td style="${tdCell}">${escapeHtml(v('customerInjury'))}</td>
                        </tr>
                        <tr>
                            <td style="${tdCell} font-weight: 500;">Did the employee receive any injury (Please give details)</td>
                            <td style="${tdCell}">${escapeHtml(v('employeeInjury'))}</td>
                        </tr>
                        <tr>
                            <td style="${tdCell} font-weight: 500;">Any damage to the customers belonging's (Please give details)</td>
                            <td style="${tdCell}">${escapeHtml(v('customerDamage'))}</td>
                        </tr>
                        <tr>
                            <td style="${tdCell} font-weight: 500;">Any damage to the employee's belonging's (Please give details)</td>
                            <td style="${tdCell}">${escapeHtml(v('employeeDamage'))}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="${tdYellowSub} font-weight: 700;">Additional Comments</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="${tdCell} min-height: 80px;">${escapeHtml(v('additionalComments'))}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Certification & Sign-off -->
                <div style="margin-top: 14px;">
                    <div style="text-align: center; font-style: italic; font-weight: 700; margin-bottom: 8px; font-size: 11.5px; color: #0b2545;">
                        I hereby certify that all information provided above is true and accurate.
                    </div>
                    <table style="${tableStyle}">
                        <tr>
                            <td style="${tdCell} width: 25%; font-weight: 600;">Print Name</td>
                            <td style="${tdCell}" colspan="2">${escapeHtml(v('reporterPrintName'))}</td>
                        </tr>
                        <tr>
                            <td style="${tdCell} font-weight: 600; vertical-align: middle;">Signature</td>
                            <td style="${tdCell} width: 50%; height: 50px; vertical-align: middle;">${renderSig(padReporter)}</td>
                            <td style="${tdCell} width: 25%; font-size: 10px; color: #64748b;">Reporter Signature</td>
                        </tr>
                        <tr>
                            <td style="${tdCell} font-weight: 600;">Date</td>
                            <td style="${tdCell}" colspan="2">${escapeHtml(v('reporterSigDate'))}</td>
                        </tr>
                    </table>
                </div>

                ${confidentialityNoticeHtml}
                <div style="text-align:right; font-size:9px; color:#64748b; margin-top:8px;">InisCare Incident Report &bull; Page 3 of 5</div>
            </div>
        `;

        // ==========================================
        // PAGE 4: Statutory Notifications & CAPA
        // ==========================================
        const page4Html = `
            <div style="${pageStyle}">
                ${headerHtml}
                <div style="text-align: center; color: #b91c1c; font-weight: 700; font-size: 11.5px; margin-bottom: 10px;">
                    Office use &ndash; to be completed by Branch Manager or Quality Assurance
                </div>

                <!-- Statutory Notifications -->
                <table style="${tableStyle}">
                    <thead>
                        <tr><th colspan="5" style="${tdYellowHeader} font-size: 12px; text-align: left;">Statutory &amp; Regulatory Notifications Checklist</th></tr>
                        <tr><th colspan="5" style="background:#fff; font-weight:normal; font-style:italic; font-size:10px; padding:3px 8px; border:0.6px solid #444; text-align:left;">(To be verified by Branch Manager / Quality Assurance )</th></tr>
                        <tr>
                            <th style="${tdYellowSub} width: 18%; text-align: left;">Statutory Body</th>
                            <th style="${tdYellowSub} width: 44%; text-align: left;">Mandatory Trigger Condition</th>
                            <th style="${tdYellowSub} width: 14%; text-align: center; vertical-align: middle; line-height: 1.3;">Required?<br><span style="font-size: 9.5px; font-weight: normal;">(Yes / No)</span></th>
                            <th style="${tdYellowSub} width: 12%; text-align: center;">Date Reported</th>
                            <th style="${tdYellowSub} width: 12%; text-align: left;">Ref / Acknowledgment</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="${tdCell} font-weight: 700;">HSA</td>
                            <td style="${tdCell}">Employee absent &gt;3 consecutive days due to workplace injury</td>
                            <td style="${tdCell} text-align: center;">${renderYnBadge(radio('hsaReq'))}</td>
                            <td style="${tdCell} text-align: center;">${escapeHtml(v('hsaDate'))}</td>
                            <td style="${tdCell}">${escapeHtml(v('hsaRef'))}</td>
                        </tr>
                        <tr>
                            <td style="${tdCell} font-weight: 700;">HSE Safeguarding</td>
                            <td style="${tdCell}">Safeguarding Concern / Vulnerable Adult Allegation</td>
                            <td style="${tdCell} text-align: center;">${renderYnBadge(radio('hseReq'))}</td>
                            <td style="${tdCell} text-align: center;">${escapeHtml(v('hseDate'))}</td>
                            <td style="${tdCell}">${escapeHtml(v('hseRef'))}</td>
                        </tr>
                        <tr>
                            <td style="${tdCell} font-weight: 700;">An Garda S&iacute;och&aacute;na</td>
                            <td style="${tdCell}">Criminal matter, violent assault, or serious safety event</td>
                            <td style="${tdCell} text-align: center;">${renderYnBadge(radio('gardaReq'))}</td>
                            <td style="${tdCell} text-align: center;">${escapeHtml(v('gardaDate'))}</td>
                            <td style="${tdCell}">${escapeHtml(v('gardaRef'))}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Managerial Review & CAPA -->
                <table style="${tableStyle}">
                    <thead>
                        <tr><th colspan="2" style="${tdYellowHeader} font-size: 12px; text-align: left;">Managerial Review &amp; Corrective Action Plan (CAPA)</th></tr>
                        <tr><th colspan="2" style="${tdYellowSub} text-align: center; font-weight: 700;">Root Cause Analysis</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="${tdCell} width: 50%;">${renderTick(chk('rc_careplan'))} <span style="margin-left: 6px;">Care Plan not followed</span></td>
                            <td style="${tdCell} width: 50%;">${renderTick(chk('rc_equipment'))} <span style="margin-left: 6px;">Equipment failure/lack of maintenance</span></td>
                        </tr>
                        <tr>
                            <td style="${tdCell}">${renderTick(chk('rc_environmental'))} <span style="margin-left: 6px;">Environmental hazard</span></td>
                            <td style="${tdCell}">${renderTick(chk('rc_comm'))} <span style="margin-left: 6px;">Communication/Handover breakdown</span></td>
                        </tr>
                        <tr>
                            <td colspan="2" style="${tdCell}">${renderTick(chk('rc_other'))} <span style="margin-left: 6px;">Other</span></td>
                        </tr>
                        <tr>
                            <td colspan="2" style="${tdCell}">
                                <div style="font-size: 10.5px; font-weight: 600; margin-bottom: 4px;">Provide further details:</div>
                                <div style="min-height: 50px;">${escapeHtml(v('rcDetails'))}</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <!-- Corrective Actions Table -->
                <table style="${tableStyle}">
                    <thead>
                        <tr>
                            <th style="${tdYellowSub} width: 72%; text-align: left;">Corrective Actions Taken</th>
                            <th style="${tdYellowSub} width: 28%; text-align: left;">Date Completed</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style="${tdCell}">Care Plan updated</td><td style="${tdCell}">${escapeHtml(v('ca_careplan_date'))}</td></tr>
                        <tr><td style="${tdCell}">Risk Assessment reassessed</td><td style="${tdCell}">${escapeHtml(v('ca_risk_date'))}</td></tr>
                        <tr><td style="${tdCell}">Equipment replaced/serviced</td><td style="${tdCell}">${escapeHtml(v('ca_equipment_date'))}</td></tr>
                        <tr><td style="${tdCell}">Staff refresher training scheduled</td><td style="${tdCell}">${escapeHtml(v('ca_training_date'))}</td></tr>
                        <tr>
                            <td style="${tdCell}">
                                <div>Other (Provide further details):</div>
                                <div style="margin-top: 2px;">${escapeHtml(v('ca_other_text'))}</div>
                            </td>
                            <td style="${tdCell} vertical-align: bottom;">${escapeHtml(v('ca_other_date'))}</td>
                        </tr>
                    </tbody>
                </table>

                ${confidentialityNoticeHtml}
                <div style="text-align:right; font-size:9px; color:#64748b; margin-top:8px;">InisCare Incident Report &bull; Page 4 of 5</div>
            </div>
        `;

        // ==========================================
        // PAGE 5: Quick Close-Out, Manager Sign-off & GDPR
        // ==========================================
        const page5Html = `
            <div style="width: 794px; min-height: 1120px; box-sizing: border-box; padding: 24px 34px; background: #ffffff; position: relative; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
                ${headerHtml}

                <!-- Manager's Quick Close-Out Checklist -->
                <table style="${tableStyle}">
                    <thead>
                        <tr><th colspan="2" style="${tdYellowHeader} font-size: 12px; text-align: left;">Manager's Quick Close-Out Checklist</th></tr>
                        <tr>
                            <th style="${tdYellowSub} width: 80%; text-align: left;">Tasks</th>
                            <th style="${tdYellowSub} width: 20%; text-align: center;">Completed &ndash; Yes / No</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style="${tdCell}">Confirm date, location, branch office, and reporter name are filled in.</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk1'))}</td></tr>
                        <tr><td style="${tdCell}">Ensure employee, client, and witness details are complete.</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk2'))}</td></tr>
                        <tr><td style="${tdCell}">Check that the incident type is selected and the event description is clear.</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk3'))}</td></tr>
                        <tr><td style="${tdCell}">Verify immediate actions, emergency calls (999/GP/NOK), injuries, and property damage are logged.</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk4'))}</td></tr>
                        <tr><td style="${tdCell}">Confirm the reporter signed and dated the form.</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk5'))}</td></tr>
                        <tr><td style="${tdCell}">HSE Safeguarding: Abuse or vulnerable adult concern? Mark Yes/No, add date &amp; ref #.</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk6'))}</td></tr>
                        <tr><td style="${tdCell}">Garda&iacute;: Crime, assault, or severe safety issue? Mark Yes/No, add date &amp; ref #.</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk7'))}</td></tr>
                        <tr><td style="${tdCell}">Care Plan updated</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk8'))}</td></tr>
                        <tr><td style="${tdCell}">Risk assessment reviewed</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk9'))}</td></tr>
                        <tr><td style="${tdCell}">Equipment fixed or replaced</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk10'))}</td></tr>
                        <tr><td style="${tdCell}">Staff training scheduled</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk11'))}</td></tr>
                        <tr><td style="${tdCell}">Other actions completed</td><td style="${tdCell} text-align: center;">${renderYnBadge(radio('chk12'))}</td></tr>
                    </tbody>
                </table>

                <!-- Manager Sign-off -->
                <table style="${tableStyle}">
                    <tr>
                        <td style="${tdCell} width: 25%; font-weight: 600;">Print Name</td>
                        <td style="${tdCell}" colspan="2">${escapeHtml(v('mgrPrintName'))}</td>
                    </tr>
                    <tr>
                        <td style="${tdCell} font-weight: 600;">Role</td>
                        <td style="${tdCell}" colspan="2">${escapeHtml(v('mgrRole'))}</td>
                    </tr>
                    <tr>
                        <td style="${tdCell} font-weight: 600; vertical-align: middle;">Signature</td>
                        <td style="${tdCell} width: 50%; height: 50px; vertical-align: middle;">${renderSig(padManager)}</td>
                        <td style="${tdCell} width: 25%; font-size: 10px; color: #64748b;">Manager Signature</td>
                    </tr>
                    <tr>
                        <td style="${tdCell} font-weight: 600;">Date</td>
                        <td style="${tdCell}" colspan="2">${escapeHtml(v('mgrSigDate'))}</td>
                    </tr>
                </table>

                <!-- DATA PROTECTION & GDPR NOTICE -->
                <div style="background: #fafafa; border: 0.6px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; font-size: 9.5px; color: #374151; line-height: 1.45; margin-top: 8px;">
                    <div style="font-size: 10.5px; font-weight: 700; color: #111827; text-transform: uppercase; margin-bottom: 4px;">Data Protection &amp; GDPR Notice</div>
                    <div style="margin-bottom: 4px;">
                        The personal data and special category health data collected on this form are processed by InisCare in accordance with the General Data Protection Regulation (GDPR) (EU) 2016/679 and the Data Protection Acts 1988–2018.
                    </div>
                    <div style="margin-bottom: 2px;">&bull; <strong>Purpose:</strong> Information is collected solely for incident management, risk mitigation, statutory reporting (including HSE NIMS / HSA), quality assurance, legal compliance, and protecting the health and safety of clients and employees.</div>
                    <div style="margin-bottom: 2px;">&bull; <strong>Confidentiality &amp; Sharing:</strong> Access is strictly restricted to authorised quality, clinical, and management personnel. Information will only be disclosed to external statutory bodies (e.g., HSE Safeguarding, Health &amp; Safety Authority, State Claims Agency, An Garda S&iacute;och&aacute;na) where required by law or contractual service agreements.</div>
                    <div>&bull; <strong>Retention:</strong> Forms are retained securely in compliance with InisCare's Data Retention Policy and statutory record-keeping periods for health and social care providers in Ireland.</div>
                </div>

                ${confidentialityNoticeHtml}
                <div style="text-align:right; font-size:9px; color:#64748b; margin-top:8px;">InisCare Incident Report &bull; Page 5 of 5 &bull; Fully Signed &amp; Audited</div>
            </div>
        `;

        const pagesHtml = `
        <div style="width: 794px; background: #ffffff; margin: 0; padding: 0;">
            ${page1Html}
            ${page2Html}
            ${page3Html}
            ${page4Html}
            ${page5Html}
        </div>`;

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.zIndex = '-1000';
        container.innerHTML = pagesHtml;
        document.body.appendChild(container);
        await new Promise(res => setTimeout(res, 80));
        return container;
    }

    // Build PDF Blob
    async function buildIncidentPdfBlob() {
        const clientVal = (v('clientFullName') || v('personCompleting') || '').trim();
        const clientPart = clientVal ? clientVal.replace(/\s+/g, '_') : 'Blank_Draft';
        const dateVal = formattedDate.replace(/\//g, '-');
        const fileName = `InisCare_Incident_Report_${clientPart}_${dateVal}.pdf`;
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
                    console.log('✓ Incident Report PDF sent in background:', data);
                }).catch(err => {
                    console.warn('⚠️ Network notice in background send:', err);
                });
            };
            reader.readAsDataURL(pdfBlob);
        } catch (e) {
            console.warn('⚠️ Failed to schedule background send:', e);
        }
    }

    // Action 1: Download / Share PDF
    if (btnDownload) {
        btnDownload.addEventListener('click', async () => {
            btnDownload.disabled = true;
            const originalText = btnDownload.innerHTML;
            btnDownload.innerHTML = 'Generating PDF...';

            try {
                const clientVal = v('clientFullName') || v('personCompleting') || 'Incident';
                const res = await buildIncidentPdfBlob();
                if (res) {
                    if (window.deliverPdf) {
                        await window.deliverPdf({
                            pdfBlob: res.blob,
                            fileName: res.fileName,
                            formType: 'Incident Report Form',
                            targetEmail: (targetEmail ? targetEmail.value.trim() : ''),
                            metadata: {
                                'Client': clientVal,
                                'Reporter': v('personCompleting') || 'N/A',
                                'Location': v('incLocation') || 'N/A',
                                'Date': formattedDate
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

    // Action 2: Email Handler
    if (btnEmail) {
        btnEmail.addEventListener('click', async () => {
            const email = (targetEmail ? targetEmail.value : '').trim();
            const emailDomain = email.toLowerCase().split('@')[1];
            if (!email || !email.includes('@') || emailDomain !== 'iniscare.ie') {
                alert('Corporate Security Policy: Documents can only be sent to official InisCare email addresses (@iniscare.ie).');
                if (targetEmail) targetEmail.focus();
                return;
            }

            btnEmail.disabled = true;
            const originalText = btnEmail.innerHTML;
            btnEmail.innerHTML = 'Sending to InisCare...';

            try {
                const clientVal = v('clientFullName') || v('personCompleting') || 'Incident';
                const res = await buildIncidentPdfBlob();
                if (!res) {
                    btnEmail.disabled = false;
                    btnEmail.innerHTML = originalText;
                    return;
                }

                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64data = reader.result;
                    try {
                        const response = await fetch('/api/send-pdf', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                pdfBase64: base64data,
                                fileName: res.fileName,
                                formType: 'Incident Report Form',
                                targetEmail: email,
                                metadata: {
                                    'Client': clientVal,
                                    'Reporter': v('personCompleting') || 'N/A',
                                    'Location': v('incLocation') || 'N/A',
                                    'Date': formattedDate
                                }
                            })
                        });

                        const data = await response.json();
                        if (response.ok && data.success) {
                            alert(`Incident Report successfully sent to ${email}!`);
                        } else {
                            alert(`Failed to send email: ${data.error || 'Server error'}`);
                        }
                    } catch (err) {
                        alert('An error occurred while sending the email: ' + err.message);
                    } finally {
                        btnEmail.disabled = false;
                        btnEmail.innerHTML = originalText;
                    }
                };
                reader.readAsDataURL(res.blob);
            } catch (err) {
                console.error(err);
                alert('An error occurred: ' + err.message);
                btnEmail.disabled = false;
                btnEmail.innerHTML = originalText;
            }
        });
    }

    // ==========================================
    // Local Draft Storage (Save & Clean Form)
    // ==========================================
    const DRAFT_KEY = 'iniscare_incident_report_draft_v1';

    function updateDraftStatus(msg, type = 'success') {
        if (!localDraftStatus) return;
        localDraftStatus.textContent = msg;
        localDraftStatus.style.color = (type === 'success') ? '#166534' : (type === 'error' ? '#991b1b' : '#475569');
        localDraftStatus.style.display = 'block';
        setTimeout(() => {
            if (localDraftStatus) localDraftStatus.style.display = 'none';
        }, 4000);
    }

    function saveLocalDraft(manual = false) {
        try {
            const formData = {
                inputs: {},
                checkboxes: {},
                radios: {},
                signatures: {},
                savedAt: new Date().toISOString()
            };

            const docEl = document.getElementById('incidentReportDocument');
            if (!docEl) return;

            docEl.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach(el => {
                if (el.id) formData.inputs[el.id] = el.value;
            });

            docEl.querySelectorAll('input[type="checkbox"]').forEach(el => {
                if (el.id) formData.checkboxes[el.id] = el.checked;
            });

            const radioNames = new Set();
            docEl.querySelectorAll('input[type="radio"]').forEach(el => {
                if (el.name) radioNames.add(el.name);
            });
            radioNames.forEach(name => {
                const checked = docEl.querySelector(`input[name="${name}"]:checked`);
                if (checked) formData.radios[name] = checked.value;
            });

            if (padReporter && !padReporter.isEmpty()) formData.signatures['sigReporter'] = padReporter.toData();
            if (padManager && !padManager.isEmpty()) formData.signatures['sigManager'] = padManager.toData();

            localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
            if (manual) {
                updateDraftStatus('Form draft saved locally on this device.', 'success');
            }
        } catch (e) {
            console.error('Failed to save draft:', e);
            if (manual) updateDraftStatus('Failed to save draft locally.', 'error');
        }
    }

    function loadLocalDraft() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const formData = JSON.parse(raw);

            if (formData.inputs) {
                Object.keys(formData.inputs).forEach(id => {
                    const el = document.getElementById(id);
                    if (el && formData.inputs[id] !== undefined) el.value = formData.inputs[id];
                });
            }

            if (formData.checkboxes) {
                Object.keys(formData.checkboxes).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.checked = !!formData.checkboxes[id];
                });
            }

            if (formData.radios) {
                Object.keys(formData.radios).forEach(name => {
                    const val = formData.radios[name];
                    const radioEl = document.querySelector(`input[name="${name}"][value="${val}"]`);
                    if (radioEl) radioEl.checked = true;
                });
            }

            if (formData.signatures) {
                if (padReporter && formData.signatures['sigReporter']) {
                    padReporter.fromData(formData.signatures['sigReporter']);
                }
                if (padManager && formData.signatures['sigManager']) {
                    padManager.fromData(formData.signatures['sigManager']);
                }
            }

            updateDraftStatus('Previous incident report draft restored.', 'info');
        } catch (e) {
            console.warn('Could not restore draft:', e);
        }
    }

    function clearLocalDraft() {
        if (!confirm('Are you sure you want to clear this Incident Report and all saved data?')) {
            return;
        }

        localStorage.removeItem(DRAFT_KEY);

        const docEl = document.getElementById('incidentReportDocument');
        if (docEl) {
            docEl.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach(el => {
                el.value = '';
            });
            docEl.querySelectorAll('input[type="checkbox"]').forEach(el => {
                el.checked = false;
            });
            docEl.querySelectorAll('input[type="radio"]').forEach(el => {
                el.checked = false;
                el.dataset.wasChecked = 'false';
            });
        }

        if (padReporter) padReporter.clear();
        if (padManager) padManager.clear();

        // Re-populate default dates
        if (repDateTime) repDateTime.value = formattedDateTime;
        if (reporterSigDate) reporterSigDate.value = formattedDate;
        if (mgrSigDate) mgrSigDate.value = formattedDate;

        updateDraftStatus('Incident Report cleared. Ready for new incident.', 'info');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

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

    // Debounced Auto-save
    let autoSaveTimer = null;
    function triggerAutoSave() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveLocalDraft(false);
        }, 1200);
    }

    const docEl = document.getElementById('incidentReportDocument');
    if (docEl) {
        docEl.addEventListener('input', triggerAutoSave);
        docEl.addEventListener('change', triggerAutoSave);
    }

    // Allow un-checking radio buttons on second click
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.dataset.wasChecked = radio.checked ? 'true' : 'false';
        radio.addEventListener('click', function() {
            if (this.dataset.wasChecked === 'true') {
                this.checked = false;
                this.dataset.wasChecked = 'false';
                triggerAutoSave();
            } else {
                document.querySelectorAll(`input[name="${this.name}"]`).forEach(r => r.dataset.wasChecked = 'false');
                this.dataset.wasChecked = 'true';
                triggerAutoSave();
            }
        });
    });

    // Restore draft if available
    loadLocalDraft();
});
