import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import PDFDocument from 'pdfkit';

import type { CaseDoc } from './case.model';

/** Hind works with pdfkit/fontkit; NotoSansDevanagari hits a GPOS crash. */
const FONT_FILE = 'Hind-Regular.ttf';
const EMBLEM_FILE = 'cg-emblem.png';

function resolveAsset(...parts: string[]): string | null {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), 'assets', ...parts),
    path.join(here, '../../../assets', ...parts),
    path.join(here, '../../../../assets', ...parts),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate))
      return candidate;
  }
  return null;
}

function resolveFontPath(): string {
  const font = resolveAsset('fonts', FONT_FILE);
  if (!font) {
    throw new Error(
      `Missing Devanagari font (${FONT_FILE}). Place it under api/assets/fonts/`,
    );
  }
  return font;
}

function resolveEmblemPath(): string | null {
  return resolveAsset('images', EMBLEM_FILE);
}

function ymd(d: Date | null | undefined): string {
  if (!d)
    return '..../..../........';
  const iso = d.toISOString().slice(0, 10);
  const [y, m, day] = iso.split('-');
  return `${day}/${m}/${y}`;
}

function bufferFromDoc(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function useHindiFont(pdf: PDFKit.PDFDocument) {
  pdf.registerFont('Hindi', resolveFontPath());
  pdf.font('Hindi');
}

function drawBlankLine(
  pdf: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
) {
  pdf
    .moveTo(x, y)
    .lineTo(x + width, y)
    .strokeColor('#222222')
    .lineWidth(0.55)
    .stroke();
}

/** Centered CG emblem watermark (drawn under body text). */
function drawCenterWatermark(pdf: PDFKit.PDFDocument) {
  const emblem = resolveEmblemPath();
  if (!emblem)
    return;
  const size = 280;
  const x = (pdf.page.width - size) / 2;
  const y = (pdf.page.height - size) / 2;
  pdf.save();
  pdf.opacity(0.12);
  pdf.image(emblem, x, y, { width: size, height: size });
  pdf.restore();
}

/**
 * Suchna Patra layout matched to DOC-20241126 official सूचना-पत्र scan.
 */
export async function buildSuchnaPatraPdf(
  doc: CaseDoc & { caseNo?: string },
): Promise<Buffer> {
  const pdf = new PDFDocument({
    margin: 48,
    size: 'A4',
    info: {
      Title: 'सूचना-पत्र',
      Author: 'Simankan',
    },
  });
  useHindiFont(pdf);
  drawCenterWatermark(pdf);

  const left = pdf.page.margins.left;
  const right = pdf.page.width - pdf.page.margins.right;
  const contentWidth = right - left;
  // Stay above bottom margin — writing below it forces a blank 2nd page.
  const footerY = pdf.page.height - pdf.page.margins.bottom - 14;

  // officeName is tehsil name today; use for मण्डल + तहसील until circle is separate
  const mandal = doc.officeName?.trim() || '………………';
  const tehsil = doc.officeName?.trim() || '………………';
  const district = doc.district?.trim() || 'रायपुर';
  const state = doc.state?.trim() || 'छत्तीसगढ़';
  const guardianType = doc.applicantGuardianType?.trim() || 'पिता / पति';
  const guardian = doc.applicantGuardianName?.trim() || '…………………………';
  const residence = doc.applicantResidence?.trim() || doc.village || '…………………………';
  const village = doc.village?.trim() || '…………………………';
  const halka = doc.patwariHalkaNumber?.trim() || '……';
  const khasraNos = (doc.khasras ?? [])
    .map(k => k.khasraNumber)
    .filter(Boolean)
    .join(', ') || '…………………………';
  const rakbaLine = (doc.khasras ?? [])
    .map(k => String(k.rakba))
    .join(', ') || '………………';
  const totalRakba = doc.totalRakba != null ? String(doc.totalRakba) : '………………';
  const demarcationTime = (doc.demarcationTime ?? '12:00').replace(':', '.');
  const recipients = (doc.neighbors ?? [])
    .map(n => `${n.ownerName}, ${n.address}`)
    .filter(Boolean);

  // —— Header (one centered line like the scan) ——
  pdf.fontSize(10.5);
  pdf.text(
    `कार्यालय राजस्व निरीक्षक मण्डल, ${mandal} तहसील ${tehsil} जिला ${district}, ${state}`,
    { width: contentWidth, align: 'center', lineGap: 1 },
  );
  pdf.moveDown(0.55);

  // —— Title ——
  pdf.fontSize(14);
  pdf.text('सूचना-पत्र', {
    width: contentWidth,
    align: 'center',
    underline: true,
  });
  pdf.moveDown(0.75);

  // —— प्रति (left) / जारी दिनांक (right) ——
  const blockTop = pdf.y;
  pdf.fontSize(10.5);
  pdf.text('प्रति,', left, blockTop);
  pdf.text(`जारी दिनांक  ${ymd(doc.issueDate)}`, right - 190, blockTop, {
    width: 190,
  });

  let lineY = blockTop + 18;
  if (recipients.length > 0) {
    pdf.fontSize(10);
    for (const line of recipients.slice(0, 4)) {
      pdf.text(line, left + 18, lineY, { width: contentWidth * 0.55 });
      lineY = pdf.y + 2;
    }
  }
  else {
    for (let i = 0; i < 4; i++) {
      drawBlankLine(pdf, left + 18, lineY, contentWidth * 0.55);
      lineY += 14;
    }
  }

  pdf.y = Math.max(lineY, blockTop + 72) + 8;

  // —— Subject + schedule (template prose, filled) ——
  pdf.fontSize(10.5);
  const subject
    = `विषय–आवेदक श्री / श्रीमती  ${doc.applicantName?.trim() || '…………………………'}  `
    + `${guardianType}  ${guardian}  निवासी  ${residence}  `
    + `जिला ${district} द्वारा आवेदित ग्राम  ${village}  `
    + `पटवारी हल्का नम्बर  ${halka}  `
    + `राजस्व निरीक्षक मण्डल ${mandal} तहसील ${tehsil} जिला ${district} में स्थित `
    + `भूमि खसरा नंबर  ${khasraNos}  रकबा क्रमशः  ${rakbaLine}  `
    + `योग रकबा  ${totalRakba}  हेक्टेयर भूमि का श्रीमान तहसीलदार ${tehsil} के `
    + `आदेश दिनांक ${ymd(doc.issueDate ?? doc.filedAt)} के परिपालन में `
    + `दिनांक ${ymd(doc.demarcationDate)} का समय ${demarcationTime} `
    + `बजे पश्चात मेरे द्वारा सीमांकन किया जाना नियत है।`;

  pdf.text(subject, {
    width: contentWidth,
    align: 'justify',
    lineGap: 3,
  });
  pdf.moveDown(0.65);

  // —— Legal body (matches scan wording) ——
  const body
    = `चूंकि आप सभी उल्लेखित खसरा नंबर के बटांकनधारी / समीपस्थ भूस्वामी हैं `
    + `इसलिये आपकी उपस्थिति सीमांकन स्थल पर होना अनिवार्य है अतः उक्त सीमांकन में `
    + `जिस किसी व्यक्ति या संस्था को कोई दावा / आपत्ति प्रस्तुत करना हो तो वह `
    + `उल्लेखित तिथि को या पूर्व नियत समय तक हल्का पटवारी के कार्यालय में `
    + `मय दस्तावेज सहित स्वयं या अभिभावक के माध्यम से उपस्थित होकर प्रस्तुत कर सकते हैं। `
    + `नियत तिथि के पश्चात मेरे द्वारा किसी भी प्रकार की दावा / आपत्ति पर विचार नहीं किया जायेगा।`;

  pdf.text(body, {
    width: contentWidth,
    align: 'justify',
    lineGap: 3,
  });

  // —— Signature (bottom-right, still on page 1) ——
  const sigX = right - 240;
  const sigY = Math.min(Math.max(pdf.y + 28, footerY - 56), footerY - 56);
  pdf.fontSize(10.5).fillColor('#000000');
  pdf.text('राजस्व निरीक्षक / द्वारा पटवारी', sigX, sigY, {
    width: 240,
    align: 'center',
  });
  pdf.text(`राजस्व निरीक्षक मण्डल ${mandal},`, sigX, pdf.y + 2, {
    width: 240,
    align: 'center',
  });
  pdf.text(`तहसील ${tehsil}`, sigX, pdf.y + 1, {
    width: 240,
    align: 'center',
  });

  pdf.fontSize(8).fillColor('#666666');
  pdf.text(`प्रकरण: ${doc.caseNo ?? '—'}`, left, footerY, {
    width: contentWidth,
    lineBreak: false,
  });

  return bufferFromDoc(pdf);
}

export type RescheduleNoticeInput = {
  previousDemarcationDate: Date | null | undefined;
  previousDemarcationTime: string | null | undefined;
  previousNoticeIssueDate?: Date | null;
  reason: string;
};

/**
 * Reschedule notice — same office form, but clearly a date change:
 * previous schedule + new schedule, for neighbors already served.
 */
export async function buildRescheduleSuchnaPdf(
  doc: CaseDoc & { caseNo?: string },
  reschedule: RescheduleNoticeInput,
): Promise<Buffer> {
  const pdf = new PDFDocument({
    margin: 48,
    size: 'A4',
    info: {
      Title: 'सूचना-पत्र (पुनर्निर्धारण)',
      Author: 'Simankan',
    },
  });
  useHindiFont(pdf);
  drawCenterWatermark(pdf);

  const left = pdf.page.margins.left;
  const right = pdf.page.width - pdf.page.margins.right;
  const contentWidth = right - left;
  const footerY = pdf.page.height - pdf.page.margins.bottom - 14;

  const mandal = doc.officeName?.trim() || '………………';
  const tehsil = doc.officeName?.trim() || '………………';
  const district = doc.district?.trim() || 'रायपुर';
  const state = doc.state?.trim() || 'छत्तीसगढ़';
  const guardianType = doc.applicantGuardianType?.trim() || 'पिता / पति';
  const guardian = doc.applicantGuardianName?.trim() || '…………………………';
  const residence = doc.applicantResidence?.trim() || doc.village || '…………………………';
  const village = doc.village?.trim() || '…………………………';
  const halka = doc.patwariHalkaNumber?.trim() || '……';
  const khasraNos = (doc.khasras ?? [])
    .map(k => k.khasraNumber)
    .filter(Boolean)
    .join(', ') || '…………………………';
  const rakbaLine = (doc.khasras ?? [])
    .map(k => String(k.rakba))
    .join(', ') || '………………';
  const totalRakba = doc.totalRakba != null ? String(doc.totalRakba) : '………………';
  const prevTime = (reschedule.previousDemarcationTime ?? '12:00').replace(':', '.');
  const newTime = (doc.demarcationTime ?? '12:00').replace(':', '.');
  const recipients = (doc.neighbors ?? [])
    .map(n => `${n.ownerName}, ${n.address}`)
    .filter(Boolean);
  const issueYmd = ymd(doc.issueDate ?? new Date());

  pdf.fontSize(10.5);
  pdf.text(
    `कार्यालय राजस्व निरीक्षक मण्डल, ${mandal} तहसील ${tehsil} जिला ${district}, ${state}`,
    { width: contentWidth, align: 'center', lineGap: 1 },
  );
  pdf.moveDown(0.55);

  pdf.fontSize(14);
  pdf.text('सूचना-पत्र (पुनर्निर्धारण)', {
    width: contentWidth,
    align: 'center',
    underline: true,
  });
  pdf.moveDown(0.35);
  pdf.fontSize(10);
  pdf.text('सीमांकन तिथि / समय परिवर्तन', {
    width: contentWidth,
    align: 'center',
  });
  pdf.moveDown(0.75);

  const blockTop = pdf.y;
  pdf.fontSize(10.5);
  pdf.text('प्रति,', left, blockTop);
  pdf.text(`जारी दिनांक  ${issueYmd}`, right - 190, blockTop, {
    width: 190,
  });

  let lineY = blockTop + 18;
  if (recipients.length > 0) {
    pdf.fontSize(10);
    for (const line of recipients.slice(0, 4)) {
      pdf.text(line, left + 18, lineY, { width: contentWidth * 0.55 });
      lineY = pdf.y + 2;
    }
  }
  else {
    for (let i = 0; i < 4; i++) {
      drawBlankLine(pdf, left + 18, lineY, contentWidth * 0.55);
      lineY += 14;
    }
  }

  pdf.y = Math.max(lineY, blockTop + 72) + 8;

  pdf.fontSize(10.5);
  const subject
    = `विषय–सीमांकन तिथि का पुनर्निर्धारण / आवेदक श्री / श्रीमती  `
    + `${doc.applicantName?.trim() || '…………………………'}  `
    + `${guardianType}  ${guardian}  निवासी  ${residence}  `
    + `जिला ${district} द्वारा आवेदित ग्राम  ${village}  `
    + `पटवारी हल्का नम्बर  ${halka}  `
    + `राजस्व निरीक्षक मण्डल ${mandal} तहसील ${tehsil} जिला ${district} में स्थित `
    + `भूमि खसरा नंबर  ${khasraNos}  रकबा क्रमशः  ${rakbaLine}  `
    + `योग रकबा  ${totalRakba}  हेक्टेयर।`;

  pdf.text(subject, {
    width: contentWidth,
    align: 'justify',
    lineGap: 3,
  });
  pdf.moveDown(0.65);

  const prevNotice = reschedule.previousNoticeIssueDate
    ? `पूर्व सूचना-पत्र दिनांक ${ymd(reschedule.previousNoticeIssueDate)} के अनुसरण में, `
    : '';
  const reason = reschedule.reason.trim() || 'प्रशासनिक कारण';
  const changeBody
    = `${prevNotice}`
    + `उक्त भूमि का सीमांकन पूर्व में दिनांक ${ymd(reschedule.previousDemarcationDate)} `
    + `को समय ${prevTime} बजे पश्चात निर्धारित था। पुनर्निर्धारण का कारण– ${reason}। `
    + `उक्त तिथि रद्द कर सीमांकन अब दिनांक ${ymd(doc.demarcationDate)} को समय ${newTime} `
    + `बजे पश्चात मेरे द्वारा किया जाना पुनर्निर्धारित किया गया है। `
    + `अतः पूर्व सूचना में अंकित तिथि निरस्त समझी जाए और नई तिथि / समय के अनुसार `
    + `सीमांकन स्थल पर उपस्थिति सुनिश्चित करें।`;

  pdf.text(changeBody, {
    width: contentWidth,
    align: 'justify',
    lineGap: 3,
  });
  pdf.moveDown(0.65);

  const body
    = `चूंकि आप सभी उल्लेखित खसरा नंबर के बटांकनधारी / समीपस्थ भूस्वामी हैं `
    + `इसलिये आपकी उपस्थिति सीमांकन स्थल पर होना अनिवार्य है अतः उक्त सीमांकन में `
    + `जिस किसी व्यक्ति या संस्था को कोई दावा / आपत्ति प्रस्तुत करना हो तो वह `
    + `नई नियत तिथि को या पूर्व नियत समय तक हल्का पटवारी के कार्यालय में `
    + `मय दस्तावेज सहित स्वयं या अभिभावक के माध्यम से उपस्थित होकर प्रस्तुत कर सकते हैं। `
    + `नई नियत तिथि के पश्चात मेरे द्वारा किसी भी प्रकार की दावा / आपत्ति पर विचार नहीं किया जायेगा।`;

  pdf.text(body, {
    width: contentWidth,
    align: 'justify',
    lineGap: 3,
  });

  const sigX = right - 240;
  const sigY = Math.min(Math.max(pdf.y + 28, footerY - 56), footerY - 56);
  pdf.fontSize(10.5).fillColor('#000000');
  pdf.text('राजस्व निरीक्षक / द्वारा पटवारी', sigX, sigY, {
    width: 240,
    align: 'center',
  });
  pdf.text(`राजस्व निरीक्षक मण्डल ${mandal},`, sigX, pdf.y + 2, {
    width: 240,
    align: 'center',
  });
  pdf.text(`तहसील ${tehsil}`, sigX, pdf.y + 1, {
    width: 240,
    align: 'center',
  });

  pdf.fontSize(8).fillColor('#666666');
  pdf.text(`प्रकरण: ${doc.caseNo ?? '—'} · पुनर्निर्धारण`, left, footerY, {
    width: contentWidth,
    lineBreak: false,
  });

  return bufferFromDoc(pdf);
}

/** Demarcation report PDF (Hindi). */
export async function buildDemarcationReportPdf(
  doc: CaseDoc & { caseNo?: string },
  note?: string | null,
): Promise<Buffer> {
  const pdf = new PDFDocument({ margin: 54, size: 'A4' });
  useHindiFont(pdf);
  const contentWidth
    = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;

  pdf.fontSize(14).text('सीमांकन प्रतिवेदन', {
    width: contentWidth,
    align: 'center',
    underline: true,
  });
  pdf.moveDown();
  pdf.fontSize(11);
  pdf.text(`प्रकरण संख्या: ${doc.caseNo ?? '—'}`);
  pdf.text(`आवेदक: ${doc.applicantName}`);
  pdf.text(`ग्राम: ${doc.village}`);
  pdf.text(`सीमांकन दिनांक: ${ymd(doc.demarcationDate)}`);
  pdf.text(
    `खसरा: ${(doc.khasras ?? []).map(k => k.khasraNumber).join(', ') || '—'}`,
  );
  pdf.moveDown();
  pdf.text(note?.trim() || 'सीमांकन पूर्ण। प्रतिवेदन प्रस्तुत।', {
    width: contentWidth,
    align: 'justify',
  });
  pdf.moveDown(2);
  pdf.text('राजस्व निरीक्षक / पटवारी', {
    width: contentWidth,
    align: 'right',
  });
  return bufferFromDoc(pdf);
}
