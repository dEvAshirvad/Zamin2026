import { writeFileSync } from 'node:fs';

import { buildRescheduleSuchnaPdf } from '../src/modules/cases/case.pdf.ts';

async function main() {
  const buf = await buildRescheduleSuchnaPdf(
    {
      caseNo: 'SEONI-2026-0003',
      officeName: 'सीओनी',
      district: 'रायपुर',
      state: 'छत्तीसगढ़',
      applicantName: 'राज किशन',
      applicantGuardianType: 'पिता',
      applicantGuardianName: 'राम किशन',
      applicantResidence: 'सीओनी',
      village: 'सीओनी',
      patwariHalkaNumber: '12',
      khasras: [
        { khasraNumber: '12', rakba: 1 },
        { khasraNumber: '13', rakba: 2 },
      ],
      totalRakba: 3,
      neighbors: [
        { ownerName: 'गांधी', address: 'सीओनी वार्ड 1' },
        { ownerName: 'पांधी', address: 'सीओनी वार्ड 2' },
      ],
      demarcationDate: new Date('2026-08-28'),
      demarcationTime: '10:30',
      issueDate: new Date('2026-08-17'),
      filedAt: new Date('2026-08-16'),
    } as never,
    {
      previousDemarcationDate: new Date('2026-08-20'),
      previousDemarcationTime: '17:05',
      previousNoticeIssueDate: new Date('2026-08-16'),
      reason: 'आवेदक की अनुपस्थिति एवं मौसम संबंधी कारण',
    },
  );
  writeFileSync('/tmp/reschedule-notice.pdf', buf);
  console.log('ok', buf.length);
  if (buf.length < 8000)
    throw new Error('PDF too small');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
