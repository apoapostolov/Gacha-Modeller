import { specialistExport } from '../specialist/report.ts';
import type { SpecialistProfile } from '../specialist/types.ts';
self.onmessage = async (event:MessageEvent<SpecialistProfile>) => {
  try { self.postMessage({type:'result',value:await specialistExport(event.data)}); }
  catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:'Specialist analysis failed.'});}
};
