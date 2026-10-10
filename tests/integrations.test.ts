import { describe, expect, it } from 'vitest';
import { hardPityBaseline } from '../src/presets/index.ts';
import { readCatalog, sampleBinding, assertBinding, applyCatalogNames } from '../src/integrations/catalog.ts';
describe('reviewed local catalogue subsets',()=>{
  it('reads vendor identities/names with locale fallback and explicit ignored resource notes',()=>{
    const r=readCatalog('playfab-v2',{data:{Items:[{Id:'a',Type:'catalogItem',Title:{NEUTRAL:'Neutral',fr:'Nom'}},{Id:'money',Type:'currency',Title:{NEUTRAL:'Currency'}}]}},'fr');
    expect(r.items).toEqual([{id:'a',name:'Nom'}]);expect(r.notes[0]).toContain('currency');
    expect(readCatalog('unity-sdk',{items:[{Id:'A',Name:'Sword',Type:'INVENTORY_ITEM'}]}).items).toEqual([{id:'A',name:'Sword'}]);
    expect(readCatalog('customer',{items:[{id:'a',name:'Customer card'}]}).items[0]!.name).toBe('Customer card');
  });
  it('rejects partial pagination, duplicate identities, unsupported shapes and missing names',()=>{
    expect(()=>readCatalog('playfab-v2',{Items:[],ContinuationToken:'next'})).toThrow('continuation token');
    expect(()=>readCatalog('customer',{items:[{id:'a',name:'A'},{id:'a',name:'B'}]})).toThrow('Duplicate');
    expect(()=>readCatalog('unity-sdk',{items:[{Id:'A',Type:'INVENTORY_ITEM'}]})).toThrow('display name');
    expect(()=>readCatalog('customer',{resources:[]})).toThrow('entries');
  });
  it('applies only explicitly mapped names without altering probabilities, identity or protection',()=>{
    const binding=sampleBinding('customer');binding.mappings=[{sourceId:'red',modelItemId:hardPityBaseline.items[0]!.id}];
    const before=structuredClone(hardPityBaseline),after=applyCatalogNames(before,binding);
    expect(after.items[0]!.name).toBe('Crimson card');expect(after.items[0]!.id).toBe(before.items[0]!.id);
    expect({...after,items:before.items}).toEqual(before);expect(after.items.slice(1)).toEqual(before.items.slice(1));expect(before).toEqual(hardPityBaseline);
  });
  it('requires unique valid source/target mappings and never synthesizes a missing model target',()=>{
    const binding=sampleBinding('customer');binding.mappings=[{sourceId:'red',modelItemId:'absent'}];expect(()=>applyCatalogNames(hardPityBaseline,binding)).toThrow('unavailable');
    binding.mappings.push({sourceId:'blue',modelItemId:'absent'});expect(()=>assertBinding(binding)).toThrow('unique');
    binding.mappings=[{sourceId:'removed',modelItemId:'a'}];expect(()=>assertBinding(binding)).toThrow('current export');
  });
});
