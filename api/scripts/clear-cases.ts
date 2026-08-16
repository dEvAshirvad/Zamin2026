/**
 * Wipe all case data (cases, transition logs, counters). Keeps users/tehsils/S3.
 *
 * Usage (from api/):
 *   pnpm exec tsx scripts/clear-cases.ts
 *   pnpm exec tsx scripts/clear-cases.ts --yes   # skip confirm
 */
import connectDB, { db } from '../src/configs/db/mongodb/index.ts';

async function main() {
  const force = process.argv.includes('--yes') || process.argv.includes('-y');
  if (!force) {
    console.error(
      'This deletes ALL cases, transition logs, and case counters.\n'
      + 'Re-run with --yes to confirm.',
    );
    process.exit(1);
  }

  await connectDB();

  const [cases, logs, counters] = await Promise.all([
    db.collection('cases').deleteMany({}),
    db.collection('case_transition_logs').deleteMany({}),
    db.collection('case_counters').deleteMany({}),
  ]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        deleted: {
          cases: cases.deletedCount,
          case_transition_logs: logs.deletedCount,
          case_counters: counters.deletedCount,
        },
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
