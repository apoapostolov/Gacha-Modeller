import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importProject } from '../src/project/project.ts';
import { defaultSpecialist } from '../src/specialist/defaults.ts';
import { sampleBinding } from '../src/integrations/catalog.ts';
const folder=await mkdtemp(join(tmpdir(),'reward-specialist-inputs-'));
const original=await importProject(JSON.parse(await readFile(new URL('../projects/digital-packs/collectible-card-pack.json',import.meta.url),'utf8')));
for(const kind of ['collectible','payout'] as const){const path=join(folder,`${kind}.json`);await writeFile(path,JSON.stringify({...original,version:6,name:`Synthetic ${kind} study`,specialist:defaultSpecialist(kind)},null,2),{flag:'wx'});console.log(`${kind}: ${path}`);}
const integration=sampleBinding('playfab-v2');integration.mappings=JSON.parse(integration.sourceJson).Items.map((r:{Id:string},i:number)=>({sourceId:r.Id,modelItemId:original.candidate.model.items[i]!.id}));
const path=join(folder,'catalogue.json');await writeFile(path,JSON.stringify({...original,version:6,name:'Synthetic catalogue mapping',integration},null,2),{flag:'wx'});console.log(`catalogue: ${path}`);
