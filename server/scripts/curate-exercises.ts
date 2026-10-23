import 'dotenv/config';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {db} from '../src/config/supabase.js';
import {exerciseInputSchema} from '../src/modules/exercises/exercise.schema.js';
import {getTaxonomies} from '../src/modules/exercises/exercise.service.js';
const apply=process.argv.includes('--apply');
const checkpoint=process.argv.find(x=>x.startsWith('--checkpoint='))?.slice(13);
if(!checkpoint || process.argv.slice(2).some(x=>x!=='--apply'&&!x.startsWith('--checkpoint='))) throw Error('Usage: tsx scripts/curate-exercises.ts --checkpoint=<original state.json> [--apply]');
function check(error:any){if(error)throw Error(error.message);}
async function rows(table:string){
 const all:any[]=[];
 for(let start=0;;start+=500){
  const order=['exercise_muscles','exercise_equipment'].includes(table)?'exercise_id':'id';
  const r=await db.from(table).select('*').order(order).range(start,start+499);check(r.error);all.push(...(r.data??[]));if((r.data?.length??0)<500)return all;
 }
}
const source=JSON.parse(await readFile(checkpoint,'utf8'));
if(source.phase!=='complete')throw Error('Original import must be complete.');
const inputs=JSON.parse(await readFile(new URL('./data/core-exercises.json',import.meta.url),'utf8')).map((x:unknown)=>exerciseInputSchema.parse(x));
const tax=await getTaxonomies();
for(const input of inputs){
 for(const [values,allowed] of [[input.primaryMuscles.concat(input.secondaryMuscles),tax.muscleGroups],[input.equipment,tax.equipmentTypes],[[input.bodyRegion],tax.bodyRegions],[[input.category],tax.categories]] as const){
  for(const code of values)if(!allowed.some((x:any)=>x.code===code))throw Error(`Unknown taxonomy: ${code}`);
 }
}
const backup:Record<string,any[]>={};
for(const table of ['exercises','exercise_muscles','exercise_equipment','exercise_media','exercise_catalog'])backup[table]=await rows(table);
// Delete only exact imported baselines; edited and unknown drafts are protected.
const removable=backup.exercises.filter(row=>{
 const entry=source.entries.find((x:any)=>x.id===row.id), catalog=backup.exercise_catalog.find(x=>x.id===row.id);
 if(!entry||!catalog||row.status!=='draft'||row.updated_at!==row.created_at)return false;
 const fields:Record<string,string>={slug:'slug',name:'name',description:'description',category:'category',activityType:'activity_type',bodyRegion:'body_region',difficulty:'difficulty',trackingType:'tracking_type',movementPattern:'movement_pattern',primaryMuscles:'primary_muscles',secondaryMuscles:'secondary_muscles',equipment:'equipment',instructions:'instructions',tips:'tips',mistakes:'mistakes',safetyNotes:'safety_notes',breathingTip:'breathing_tip',status:'status'};
 for(const [key,column] of Object.entries(fields)){
  let a=entry.input[key],b=catalog[column];
  if(['primaryMuscles','secondaryMuscles','equipment'].includes(key)){a=[...a].sort();b=[...b].sort();}
  if(JSON.stringify(a)!==JSON.stringify(b))return false;
 }
 const media=backup.exercise_media.filter(x=>x.exercise_id===row.id);
 return media.length===entry.images.length&&media.every(x=>entry.images.includes(x.source_url)&&x.credit==='yuhonas/free-exercise-db'&&x.license==='Unlicense / public domain (source repository)'&&x.alt_text===`${entry.input.name} — demonstration ${entry.images.indexOf(x.source_url)+1}`);
});
const protectedRows=backup.exercises.filter(x=>!removable.some(r=>r.id===x.id));
const aliases: Record<string,string> = {pullups:'pullup',legextensions:'legextensionmachine',cableflycrossovers:'chestflycable'};
const nameKey=(name:string)=>{ const key=name.toLowerCase().replace(/[^a-z0-9]/g,''); return aliases[key] ?? key; };
const desired=inputs.filter((input:any)=>!protectedRows.some(x=>x.slug===input.slug||nameKey(x.name)===nameKey(input.name)));
console.log(JSON.stringify({before:backup.exercises.length,remove:removable.length,preserve:protectedRows.map(x=>x.name),add:desired.length,after:protectedRows.length+desired.length,apply},null,2));
if(!apply)process.exit(0);
const adminId=process.env.SEED_ADMIN_USER_ID;if(!adminId)throw Error('Set SEED_ADMIN_USER_ID.');
const directory=`.exercise-imports/core-${Date.now()}`;
await mkdir(directory,{recursive:true,mode:0o700});
await writeFile(`${directory}/backup.json`,JSON.stringify(backup,null,2),{mode:0o600});
const plan={removed:[] as string[],staged:[] as {id:string;slug:string}[],protected:protectedRows.map(x=>x.id),complete:false};
const save=()=>writeFile(`${directory}/plan.json`,JSON.stringify(plan,null,2),{mode:0o600});
await save();console.log(`Backup: ${directory}/backup.json`);
// Stage every replacement before deleting anything. Do not overwrite existing exercises.
for(const input of desired){
 const r=await db.rpc('save_fitsync_exercise',{p_id:null,p_actor:adminId,p_data:{...input,slug:`core-staged-${input.slug}`}});check(r.error);
 plan.staged.push({id:r.data,slug:input.slug});await save();
}
const stable=(items:any[])=>JSON.stringify(items.map(x=>JSON.stringify(x)).sort());
for(const table of ['exercises','exercise_muscles','exercise_equipment','exercise_media']){
 const current=(await rows(table)).filter(x=>!plan.staged.some(s=>s.id===(table==='exercises'?x.id:x.exercise_id)));
 if(stable(current)!==stable(backup[table]))throw Error(`Catalog changed during staging (${table}); old exercises retained. See ${directory}.`);
}
for(let offset=0;offset<removable.length;offset+=25){
 const batch=removable.slice(offset,offset+25);
 const conditions=batch.map(x=>`and(id.eq.${x.id},updated_at.eq.${x.updated_at})`).join(',');
 const r=await db.from('exercises').delete().eq('status','draft').or(conditions).select('id');check(r.error);
 plan.removed.push(...(r.data??[]).map(x=>x.id));await save();
 if(r.data?.length!==batch.length)throw Error('Exercise changed during cleanup; stopped to preserve edits.');
}
// Provider assets remain available for recovery using the private snapshot.
for(const staged of plan.staged){const r=await db.from('exercises').update({slug:staged.slug}).eq('id',staged.id).select('id').single();check(r.error);}
const final=await rows('exercises');
for(const original of protectedRows)if(JSON.stringify(final.find(x=>x.id===original.id))!==JSON.stringify(original))throw Error('Protected exercise verification failed.');
const media=await rows('exercise_media');
for(const original of backup.exercise_media.filter(x=>plan.protected.includes(x.exercise_id)))if(JSON.stringify(media.find(x=>x.id===original.id))!==JSON.stringify(original))throw Error('Protected media verification failed.');
if(final.length!==protectedRows.length+desired.length||final.some(x=>x.slug.startsWith('core-staged-')))throw Error('Final count verification failed.');
if(media.some(x=>plan.staged.some(s=>s.id===x.exercise_id)))throw Error('New media slots must be empty.');
plan.complete=true;await save();
console.log(JSON.stringify({removed:plan.removed.length,added:plan.staged.length,preserved:protectedRows.length,total:final.length,newMedia:0,backup:directory},null,2));
