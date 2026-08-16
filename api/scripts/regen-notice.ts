/**
 * Rebuild notice PDF for a case and overwrite noticePdfObjectKey.
 * Usage: pnpm exec tsx scripts/regen-notice.ts <caseId>
 */
import { randomUUID } from 'node:crypto';

import connectDB from '../src/configs/db/mongodb/index.ts';
import { isS3Configured, putObject } from '../src/configs/s3.ts';
import { CaseModel } from '../src/modules/cases/case.model.ts';
import { buildSuchnaPatraPdf } from '../src/modules/cases/case.pdf.ts';

async function main() {
  const caseId = process.argv[2];
  if (!caseId) {
    console.error('Usage: tsx scripts/regen-notice.ts <caseId>');
    process.exit(1);
  }
  if (!isS3Configured()) {
    console.error('S3 not configured');
    process.exit(1);
  }

  await connectDB();
  const doc = await CaseModel.findById(caseId);
  if (!doc) {
    console.error('Case not found');
    process.exit(1);
  }

  const body = await buildSuchnaPatraPdf(doc);
  console.log('pdf bytes', body.length);
  if (body.length < 5000)
    throw new Error('PDF too small — font likely missing');

  const key = `cases/${doc.tehsilId}/${doc._id}/notice-${randomUUID()}.pdf`;
  await putObject({ key, body, contentType: 'application/pdf' });
  doc.noticePdfObjectKey = key;
  await doc.save();
  console.log('ok', key);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
