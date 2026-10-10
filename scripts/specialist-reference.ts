import { readFile } from 'node:fs/promises';
import { deepStrictEqual } from 'node:assert';
import { performance } from 'node:perf_hooks';
import { specialistExport } from '../src/specialist/report.ts';
import { defaultSpecialist } from '../src/specialist/defaults.ts';
for(const kind of ['payout','collectible'] as const){
  const reference=JSON.parse(await readFile(new URL(`../docs/specialist-${kind}-reference.json`,import.meta.url),'utf8'));
  const output=await specialistExport(reference.profile);deepStrictEqual(output,reference);
  console.log(JSON.stringify({profile:kind,replay:'exact',scopeHash:output.scopeHash}));
}
const benchmark=defaultSpecialist('payout');benchmark.run={seed:42,trials:1000,rounds:100,sessionsPerTrial:10};
const start=performance.now();await specialistExport(benchmark);console.log(JSON.stringify({benchmark:'2 models × 1,000,000 possible plays',elapsedMs:Math.round(performance.now()-start)}));
