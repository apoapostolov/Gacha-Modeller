import type { Banner } from '../engine/types.ts';
export type CatalogProvider = 'playfab-v2' | 'unity-sdk' | 'customer';
export interface CatalogBinding { format: 'catalog-binding'; version: 1; provider: CatalogProvider; locale: string; sourceJson: string; mappings: { sourceId: string; modelItemId: string }[] }
export interface CatalogItem { id: string; name: string }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const title = (v: unknown) => typeof v === 'string' && !!v.trim() && v.length <= 512;
export function readCatalog(provider: CatalogProvider, value: unknown, locale = 'NEUTRAL') {
  if (!object(value)) throw new Error('Catalogue: Provide an export object.');
  let raw: unknown; const notes: string[]=[];
  if(provider==='playfab-v2') {
    const page = object(value.data) ? value.data : value;
    if(page.ContinuationToken) throw new Error('Catalogue: This PlayFab page has a continuation token. Combine all pages and remove the token only after collection is complete.');
    raw=page.Items;
  } else if(provider==='unity-sdk') raw=value.items;
  else if(provider==='customer') raw=value.items;
  else throw new Error('Catalogue: Unsupported adapter.');
  if(!Array.isArray(raw)||raw.length<1||raw.length>2000) throw new Error('Catalogue: Provide 1–2,000 entries.');
  const items:CatalogItem[]=[];const ids=new Set<string>();
  for(const [i,row] of raw.entries()) {
    if(!object(row))throw new Error(`Catalogue row ${i+1}: Expected an object.`);
    let id:unknown,name:unknown;
    if(provider==='playfab-v2') {
      if(row.Type!=='catalogItem'){notes.push(`Row ${i+1}: ${String(row.Type)} resource excluded; only catalogItem identities are mapped.`);continue;}
      id=row.Id; name=object(row.Title)?row.Title[locale]??row.Title.NEUTRAL:undefined;
    } else if(provider==='unity-sdk') {
      if(row.Type!=='INVENTORY_ITEM'){notes.push(`Row ${i+1}: ${String(row.Type)} resource excluded; only INVENTORY_ITEM definitions are mapped.`);continue;}
      id=row.Id;name=row.Name;
    } else {id=row.id;name=row.name;}
    if(!title(id)||!title(name)) throw new Error(`Catalogue row ${i+1}: A valid identity and display name are required.`);
    if(ids.has(String(id)))throw new Error(`Catalogue row ${i+1}: Duplicate identity ${String(id)}.`);ids.add(String(id));
    items.push({id:String(id),name:String(name)});
  }
  if(!items.length)throw new Error('Catalogue: No supported inventory definitions were found.');
  notes.push('Only identities and names are mapped. Prices, ownership, bundles, receipts, odds, pity and cash values require separate contracts.');
  return {items,notes};
}
export function assertBinding(v: unknown): asserts v is CatalogBinding {
  if(!object(v)||v.format!=='catalog-binding'||v.version!==1||!['playfab-v2','unity-sdk','customer'].includes(String(v.provider)))throw new Error('Catalogue binding: Unsupported format.');
  for(const key of Object.keys(v))if(!['format','version','provider','locale','sourceJson','mappings'].includes(key))throw new Error(`Catalogue binding.${key}: Unsupported field.`);
  if(typeof v.locale!=='string'||v.locale.length>64||typeof v.sourceJson!=='string'||new TextEncoder().encode(v.sourceJson).byteLength>1000000||!Array.isArray(v.mappings)||v.mappings.length>2000)throw new Error('Catalogue binding: Invalid locale, source (≤1 MB) or mapping list.');
  const catalog=readCatalog(v.provider as CatalogProvider,JSON.parse(v.sourceJson),v.locale);const sourceIds=new Set(catalog.items.map(r=>r.id));const seen=new Set<string>(),targets=new Set<string>();
  for(const row of v.mappings){if(!object(row)||Object.keys(row).some(k=>!['sourceId','modelItemId'].includes(k))||!title(row.sourceId)||!title(row.modelItemId)||!sourceIds.has(String(row.sourceId))||seen.has(String(row.sourceId))||targets.has(String(row.modelItemId)))throw new Error('Catalogue mapping: Use unique source and model identities from the current export.');seen.add(String(row.sourceId));targets.add(String(row.modelItemId));}
}
export function applyCatalogNames(model: Banner, binding: CatalogBinding): Banner {
  assertBinding(binding); const catalog=readCatalog(binding.provider,JSON.parse(binding.sourceJson),binding.locale);
  const names=new Map(catalog.items.map(r=>[r.id,r.name]));const mapped=new Map(binding.mappings.map(r=>[r.modelItemId,names.get(r.sourceId)!]));
  if(binding.mappings.length===0)throw new Error('Catalogue mapping: Map at least one item before applying.');
  for(const id of mapped.keys())if(!model.items.some(r=>r.id===id))throw new Error(`Catalogue mapping: Model item ${id} is unavailable.`);
  return {...structuredClone(model),items:model.items.map(r=>({...r,name:mapped.get(r.id)??r.name}))};
}
export function sampleBinding(provider:CatalogProvider):CatalogBinding {
  const value=provider==='playfab-v2'?{Items:[{Id:'synthetic-red',Type:'catalogItem',Title:{NEUTRAL:'Crimson card'}},{Id:'synthetic-blue',Type:'catalogItem',Title:{NEUTRAL:'Azure card'}}]}:
    provider==='unity-sdk'?{items:[{Id:'SYNTHETIC_RED',Name:'Crimson card',Type:'INVENTORY_ITEM'},{Id:'SYNTHETIC_BLUE',Name:'Azure card',Type:'INVENTORY_ITEM'}]}:{items:[{id:'red',name:'Crimson card'},{id:'blue',name:'Azure card'}]};
  return {format:'catalog-binding',version:1,provider,locale:'NEUTRAL',sourceJson:JSON.stringify(value,null,2),mappings:[]};
}
