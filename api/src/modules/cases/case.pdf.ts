import { existsSync } from 'node:fs';
import path from 'node:path';

import PDFDocument from 'pdfkit';

import type { CaseDoc } from './case.model';

/** Hind works with pdfkit/fontkit; NotoSansDevanagari hits a GPOS crash. */
const FONT_FILE = 'Hind-Regular.ttf';
const EMBLEM_FILE = 'cg-emblem.png';

/** Official A4 letter margins (~22 mm). */
const PAGE_MARGIN = 62;
const BODY_SIZE = 11;
const HEADER_SIZE = 11;
const TITLE_SIZE = 13;
const META_SIZE = 9.5;
const FOOTER_SIZE = 8;
/** Comfortable steno line gap for filled Hindi prose. */
const BODY_LINE_GAP = 5;

function resolveAsset(...parts: string[]): string | null {
  // CJS build (no package "type":"module") — __dirname works; import.meta does not.
  const candidates = [
    path.join(process.cwd(), 'assets', ...parts),
    path.join(__dirname, '../../../assets', ...parts),
    path.join(__dirname, '../../../../assets', ...parts),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function resolveFontPath(): string {
  const font = resolveAsset('fonts', FONT_FILE);
  if (!font) {
    throw new Error(
      `Missing Devanagari font (${FONT_FILE}). Place it under api/assets/fonts/`
    );
  }
  return font;
}

function resolveEmblemPath(): string | null {
  return resolveAsset('images', EMBLEM_FILE);
}

function ymd(d: Date | null | undefined): string {
  if (!d) return '.... / .... / ............';
  const iso = d.toISOString().slice(0, 10);
  const [y, m, day] = iso.split('-');
  return `${day}/${m}/${y}`;
}

/** Empty / placeholder → dotted blank (official form style). */
function blank(value: string | null | undefined, dots = 16): string {
  const v = value?.trim();
  if (!v || v === '—' || v === '-') return '.'.repeat(Math.max(4, dots));
  return v;
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
  pdf.fillColor('#111111');
}

function drawBlankLine(
  pdf: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number
) {
  pdf
    .save()
    .moveTo(x, y)
    .lineTo(x + width, y)
    .strokeColor('#4a4a4a')
    .lineWidth(0.4)
    .stroke()
    .restore();
}

/** Faint centered CG emblem — sits under text, never competes with it. */
function drawCenterWatermark(pdf: PDFKit.PDFDocument) {
  const emblem = resolveEmblemPath();
  if (!emblem) return;
  const size = 220;
  const x = (pdf.page.width - size) / 2;
  const y = (pdf.page.height - size) / 2 - 8;
  pdf.save();
  // Ghost seal — readable text first; stamp is atmosphere only.
  pdf.opacity(0.06);
  pdf.image(emblem, x, y, { width: size, height: size });
  pdf.restore();
}

type OfficeFields = {
  mandal: string;
  tehsil: string;
  district: string;
  state: string;
  guardianType: string;
  guardian: string;
  residence: string;
  village: string;
  halka: string;
  khasraNos: string;
  rakbaLine: string;
  totalRakba: string;
  demarcationTime: string;
  recipients: string[];
};

function officeFieldsFromCase(doc: CaseDoc): OfficeFields {
  const khasraRows = doc.khasras ?? [];
  return {
    mandal: blank(doc.officeName, 12),
    tehsil: blank(doc.officeName, 12),
    district: doc.district?.trim() || 'रायपुर',
    state: doc.state?.trim() || 'छत्तीसगढ़',
    guardianType: doc.applicantGuardianType?.trim() || 'पिता / पति',
    guardian: blank(doc.applicantGuardianName, 18),
    residence: blank(doc.applicantResidence?.trim() || doc.village, 20),
    village: blank(doc.village?.trim() === '—' ? null : doc.village, 14),
    halka: blank(doc.patwariHalkaNumber, 6),
    khasraNos:
      khasraRows.length > 0
        ? khasraRows
            .map((k) => k.khasraNumber)
            .filter(Boolean)
            .join(', ')
        : blank(null, 36),
    rakbaLine:
      khasraRows.length > 0
        ? khasraRows.map((k) => String(k.rakba)).join(', ')
        : blank(null, 22),
    totalRakba:
      khasraRows.length > 0 && doc.totalRakba != null
        ? String(doc.totalRakba)
        : blank(null, 8),
    demarcationTime: (doc.demarcationTime ?? '12:00').replace(':', '.'),
    recipients: (doc.neighbors ?? [])
      .map((n) => `${n.ownerName}, ${n.address}`)
      .filter(Boolean),
  };
}

function drawOfficeHeader(
  pdf: PDFKit.PDFDocument,
  opts: {
    left: number;
    contentWidth: number;
    mandal: string;
    tehsil: string;
    district: string;
    state: string;
    title: string;
    subtitle?: string;
  }
) {
  pdf.fontSize(HEADER_SIZE);
  pdf.text(
    `कार्यालय राजस्व निरीक्षक मण्डल, ${opts.mandal} तहसील ${opts.tehsil} जिला ${opts.district}, ${opts.state}`,
    opts.left,
    pdf.page.margins.top + 4,
    { width: opts.contentWidth, align: 'center', lineGap: 2 }
  );
  pdf.moveDown(0.85);
  pdf.fontSize(TITLE_SIZE);
  pdf.text(opts.title, {
    width: opts.contentWidth,
    align: 'center',
    underline: true,
  });
  if (opts.subtitle) {
    pdf.moveDown(0.35);
    pdf.fontSize(META_SIZE);
    pdf.text(opts.subtitle, {
      width: opts.contentWidth,
      align: 'center',
    });
  }
  pdf.moveDown(1.1);
}

function drawRecipientBlock(
  pdf: PDFKit.PDFDocument,
  opts: {
    left: number;
    right: number;
    contentWidth: number;
    issueDate: Date | null | undefined;
    recipients: string[];
    slots?: number;
  }
) {
  const slots = opts.slots ?? 5;
  const blockTop = pdf.y;
  const dateColW = 168;
  pdf.fontSize(BODY_SIZE);
  pdf.text('प्रति,', opts.left, blockTop);
  pdf.text(
    `जारी दिनांक  ${ymd(opts.issueDate)}`,
    opts.right - dateColW,
    blockTop,
    {
      width: dateColW,
      align: 'right',
    }
  );

  const lineStartX = opts.left + 22;
  const lineW = opts.contentWidth * 0.62;
  let lineY = blockTop + 22;
  pdf.fontSize(META_SIZE + 0.5);
  for (let i = 0; i < slots; i++) {
    const line = opts.recipients[i];
    if (line) {
      pdf.fillColor('#111111');
      pdf.text(line, lineStartX, lineY - 2, {
        width: lineW,
        lineBreak: false,
      });
      drawBlankLine(pdf, lineStartX, lineY + 11, lineW);
      lineY += 18;
    } else {
      drawBlankLine(pdf, lineStartX, lineY + 8, lineW);
      lineY += 18;
    }
  }
  pdf.y = lineY + 14;
  pdf.fillColor('#111111');
  pdf.fontSize(BODY_SIZE);
}

function drawSignatureBlock(
  pdf: PDFKit.PDFDocument,
  opts: {
    left: number;
    right: number;
    footerY: number;
    mandal: string;
    tehsil: string;
    caseNo?: string;
    caseSuffix?: string;
  }
) {
  const sigW = 210;
  const sigX = opts.right - sigW;
  const sigY = Math.min(
    Math.max(pdf.y + 36, opts.footerY - 72),
    opts.footerY - 72
  );
  pdf.fontSize(BODY_SIZE).fillColor('#111111');
  pdf.text('राजस्व निरीक्षक / द्वारा पटवारी', sigX, sigY, {
    width: sigW,
    align: 'center',
  });
  pdf.text(`राजस्व निरीक्षक मण्डल ${opts.mandal},`, sigX, pdf.y + 2, {
    width: sigW,
    align: 'center',
  });
  pdf.text(`तहसील ${opts.tehsil}`, sigX, pdf.y + 1, {
    width: sigW,
    align: 'center',
  });

  const caseLabel = opts.caseSuffix
    ? `प्रकरण: ${opts.caseNo ?? '—'} · ${opts.caseSuffix}`
    : `प्रकरण: ${opts.caseNo ?? '—'}`;
  pdf.fontSize(FOOTER_SIZE).fillColor('#555555');
  pdf.text(caseLabel, opts.left, opts.footerY, {
    width: opts.right - opts.left,
    lineBreak: false,
  });
  pdf.fillColor('#111111');
}

/**
 * Suchna Patra — official steno layout (DOC-20241126 style).
 */
export async function buildSuchnaPatraPdf(
  doc: CaseDoc & { caseNo?: string }
): Promise<Buffer> {
  const pdf = new PDFDocument({
    margin: PAGE_MARGIN,
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
  const footerY = pdf.page.height - pdf.page.margins.bottom - 10;
  const f = officeFieldsFromCase(doc);

  drawOfficeHeader(pdf, {
    left,
    contentWidth,
    mandal: f.mandal,
    tehsil: f.tehsil,
    district: f.district,
    state: f.state,
    title: 'सूचना-पत्र',
  });

  drawRecipientBlock(pdf, {
    left,
    right,
    contentWidth,
    issueDate: doc.issueDate,
    recipients: f.recipients,
  });

  const subject =
    `विषय–आवेदक श्री / श्रीमती  ${blank(doc.applicantName, 18)}  ` +
    `${f.guardianType}  ${f.guardian}  निवासी  ${f.residence}  ` +
    `जिला ${f.district} द्वारा आवेदित ग्राम  ${f.village}  ` +
    `पटवारी हल्का नम्बर  ${f.halka}  ` +
    `राजस्व निरीक्षक मण्डल ${f.mandal} तहसील ${f.tehsil} जिला ${f.district} में स्थित ` +
    `भूमि खसरा नंबर  ${f.khasraNos}  रकबा क्रमशः  ${f.rakbaLine}  ` +
    `योग रकबा  ${f.totalRakba}  हेक्टेयर भूमि का श्रीमान तहसीलदार ${f.tehsil} के ` +
    `आदेश दिनांक ${ymd(doc.tehsildarOrderDate ?? doc.issueDate ?? doc.filedAt)} के परिपालन में ` +
    `दिनांक ${ymd(doc.demarcationDate)} का समय ${f.demarcationTime} ` +
    `बजे पश्चात मेरे द्वारा सीमांकन किया जाना नियत है।`;

  pdf.fontSize(BODY_SIZE);
  pdf.text(subject, {
    width: contentWidth,
    align: 'justify',
    lineGap: BODY_LINE_GAP,
  });
  pdf.moveDown(0.85);

  const body =
    `चूंकि आप सभी उल्लेखित खसरा नंबर के बटांकनधारी / समीपस्थ भूस्वामी हैं ` +
    `इसलिये आपकी उपस्थिति सीमांकन स्थल पर होना अनिवार्य है अतः उक्त सीमांकन में ` +
    `जिस किसी व्यक्ति या संस्था को कोई दावा / आपत्ति प्रस्तुत करना हो तो वह ` +
    `उल्लेखित तिथि को या पूर्व नियत समय तक हल्का पटवारी के कार्यालय में ` +
    `मय दस्तावेज सहित स्वयं या अभिभावक के माध्यम से उपस्थित होकर प्रस्तुत कर सकते हैं। ` +
    `नियत तिथि के पश्चात मेरे द्वारा किसी भी प्रकार की दावा / आपत्ति पर विचार नहीं किया जायेगा।`;

  pdf.text(body, {
    width: contentWidth,
    align: 'justify',
    lineGap: BODY_LINE_GAP,
  });

  drawSignatureBlock(pdf, {
    left,
    right,
    footerY,
    mandal: f.mandal,
    tehsil: f.tehsil,
    caseNo: doc.caseNo,
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
  reschedule: RescheduleNoticeInput
): Promise<Buffer> {
  const pdf = new PDFDocument({
    margin: PAGE_MARGIN,
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
  const footerY = pdf.page.height - pdf.page.margins.bottom - 10;
  const f = officeFieldsFromCase(doc);

  drawOfficeHeader(pdf, {
    left,
    contentWidth,
    mandal: f.mandal,
    tehsil: f.tehsil,
    district: f.district,
    state: f.state,
    title: 'सूचना-पत्र (पुनर्निर्धारण)',
    subtitle: 'सीमांकन तिथि / समय परिवर्तन',
  });

  drawRecipientBlock(pdf, {
    left,
    right,
    contentWidth,
    issueDate: doc.issueDate ?? new Date(),
    recipients: f.recipients,
    slots: 4,
  });

  const subject =
    `विषय–सीमांकन तिथि का पुनर्निर्धारण / आवेदक श्री / श्रीमती  ` +
    `${blank(doc.applicantName, 18)}  ` +
    `${f.guardianType}  ${f.guardian}  निवासी  ${f.residence}  ` +
    `जिला ${f.district} द्वारा आवेदित ग्राम  ${f.village}  ` +
    `पटवारी हल्का नम्बर  ${f.halka}  ` +
    `राजस्व निरीक्षक मण्डल ${f.mandal} तहसील ${f.tehsil} जिला ${f.district} में स्थित ` +
    `भूमि खसरा नंबर  ${f.khasraNos}  रकबा क्रमशः  ${f.rakbaLine}  ` +
    `योग रकबा  ${f.totalRakba}  हेक्टेयर।`;

  pdf.fontSize(BODY_SIZE);
  pdf.text(subject, {
    width: contentWidth,
    align: 'justify',
    lineGap: BODY_LINE_GAP,
  });
  pdf.moveDown(0.75);

  const prevTime = (reschedule.previousDemarcationTime ?? '12:00').replace(
    ':',
    '.'
  );
  const prevNotice = reschedule.previousNoticeIssueDate
    ? `पूर्व सूचना-पत्र दिनांक ${ymd(reschedule.previousNoticeIssueDate)} के अनुसरण में, `
    : '';
  const reason = reschedule.reason.trim() || 'प्रशासनिक कारण';
  const changeBody =
    `${prevNotice}` +
    `उक्त भूमि का सीमांकन पूर्व में दिनांक ${ymd(reschedule.previousDemarcationDate)} ` +
    `को समय ${prevTime} बजे पश्चात निर्धारित था। पुनर्निर्धारण का कारण– ${reason}। ` +
    `उक्त तिथि रद्द कर सीमांकन अब दिनांक ${ymd(doc.demarcationDate)} को समय ${f.demarcationTime} ` +
    `बजे पश्चात मेरे द्वारा किया जाना पुनर्निर्धारित किया गया है। ` +
    `अतः पूर्व सूचना में अंकित तिथि निरस्त समझी जाए और नई तिथि / समय के अनुसार ` +
    `सीमांकन स्थल पर उपस्थिति सुनिश्चित करें।`;

  pdf.text(changeBody, {
    width: contentWidth,
    align: 'justify',
    lineGap: BODY_LINE_GAP,
  });
  pdf.moveDown(0.75);

  const body =
    `चूंकि आप सभी उल्लेखित खसरा नंबर के बटांकनधारी / समीपस्थ भूस्वामी हैं ` +
    `इसलिये आपकी उपस्थिति सीमांकन स्थल पर होना अनिवार्य है अतः उक्त सीमांकन में ` +
    `जिस किसी व्यक्ति या संस्था को कोई दावा / आपत्ति प्रस्तुत करना हो तो वह ` +
    `नई नियत तिथि को या पूर्व नियत समय तक हल्का पटवारी के कार्यालय में ` +
    `मय दस्तावेज सहित स्वयं या अभिभावक के माध्यम से उपस्थित होकर प्रस्तुत कर सकते हैं। ` +
    `नई नियत तिथि के पश्चात मेरे द्वारा किसी भी प्रकार की दावा / आपत्ति पर विचार नहीं किया जायेगा।`;

  pdf.text(body, {
    width: contentWidth,
    align: 'justify',
    lineGap: BODY_LINE_GAP,
  });

  drawSignatureBlock(pdf, {
    left,
    right,
    footerY,
    mandal: f.mandal,
    tehsil: f.tehsil,
    caseNo: doc.caseNo,
    caseSuffix: 'पुनर्निर्धारण',
  });

  return bufferFromDoc(pdf);
}

/** Demarcation report PDF (Hindi). */
export async function buildDemarcationReportPdf(
  doc: CaseDoc & { caseNo?: string },
  note?: string | null
): Promise<Buffer> {
  const pdf = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
  useHindiFont(pdf);
  const contentWidth =
    pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;

  pdf.fontSize(TITLE_SIZE).text('सीमांकन प्रतिवेदन', {
    width: contentWidth,
    align: 'center',
    underline: true,
  });
  pdf.moveDown();
  pdf.fontSize(BODY_SIZE);
  pdf.text(`प्रकरण संख्या: ${doc.caseNo ?? '—'}`);
  pdf.text(`आवेदक: ${doc.applicantName}`);
  pdf.text(`ग्राम: ${doc.village}`);
  pdf.text(`सीमांकन दिनांक: ${ymd(doc.demarcationDate)}`);
  pdf.text(
    `खसरा: ${(doc.khasras ?? []).map((k) => k.khasraNumber).join(', ') || '—'}`
  );
  pdf.moveDown();
  pdf.text(note?.trim() || 'सीमांकन पूर्ण। प्रतिवेदन प्रस्तुत।', {
    width: contentWidth,
    align: 'justify',
    lineGap: BODY_LINE_GAP,
  });
  pdf.moveDown(2);
  pdf.text('राजस्व निरीक्षक / पटवारी', {
    width: contentWidth,
    align: 'right',
  });
  return bufferFromDoc(pdf);
}
