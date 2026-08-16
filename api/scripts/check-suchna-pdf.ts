import { writeFileSync } from 'node:fs';

import { buildSuchnaPatraPdf } from '../src/modules/cases/case.pdf.ts';

async function main() {
  const buf = await buildSuchnaPatraPdf({
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
    tehsildarName: 'सीओनी',
    demarcationDate: new Date('2026-08-20'),
    demarcationTime: '12:00',
    issueDate: new Date('2026-08-16'),
  } as never);

  writeFileSync('/tmp/suchna-fixed.pdf', buf);
  console.log('ok', buf.length);
  if (buf.length < 5000)
    throw new Error('PDF too small — font/layout likely broken');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
