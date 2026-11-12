import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function setup(storage = new Map()) {
  const load = (file, deps) => { const exports = {}; const source = readFileSync(new URL(file, import.meta.url), 'utf8'); const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText; vm.runInNewContext(js, {exports,require:name=>{if (!(name in deps))throw Error(name);return deps[name];},Date,Map,Set,Promise}); return exports; };
  const setState = load('../src/features/workouts/set-state.ts', {});
  const api = load('../src/features/workouts/offline.ts', {'./set-state':setState,'@react-native-async-storage/async-storage':{getItem:async k=>storage.get(k)??null,setItem:async(k,v)=>storage.set(k,v),removeItem:async k=>storage.delete(k)}});
  return {api,storage};
}
const session = () => ({id:'session',status:'active',notes:'',started_at:new Date().toISOString(),workout_session_exercises:[{id:'exercise',workout_logged_sets:[{id:'set',reps:8,weight_kg:20,completed_at:null}]}]});
const noop = {set:async()=>{},notes:async()=>{},finish:async()=>{}};
test('offline edits persist through reload, merge patches and remain scoped to their owner',async()=>{
 const {api,storage}=setup(); await api.cacheWorkout('alice',session()); await api.queueSet('alice','set',{reps:10}); await api.queueSet('alice','set',{weightKg:22,completed:true});
 const reloaded=setup(storage).api; const draft=await reloaded.readWorkoutDraft('alice'); assert.equal(draft.session.workout_session_exercises[0].workout_logged_sets[0].reps,10); assert.equal(draft.sets.set.patch.weightKg,22); assert.equal(draft.sets.set.patch.reps,10); assert.equal(await reloaded.readWorkoutDraft('bob'),null);
 const calls=[]; await reloaded.flushWorkoutDraft('alice',()=>true,{...noop,set:async(...args)=>calls.push(args)}); assert.equal(calls.length,1); assert.equal(api.draftPending(await api.readWorkoutDraft('alice')),0);
});
test('network failure retains the exact queued edit and prevents a remote refresh from replacing it',async()=>{
 const {api}=setup(); await api.cacheWorkout('alice',session());await api.queueSet('alice','set',{reps:12});
 await assert.rejects(()=>api.flushWorkoutDraft('alice',()=>true,{...noop,set:async()=>{throw Error('offline');}}),/offline/);
 await api.cacheWorkout('alice',session()); assert.equal((await api.readWorkoutDraft('alice')).session.workout_session_exercises[0].workout_logged_sets[0].reps,12);
 await assert.rejects(()=>api.cacheWorkout('alice',{...session(),id:'other'}),/still needs to sync/);
});
test('an edit made during upload survives the earlier acknowledgement and is uploaded next',async()=>{
 const {api}=setup();await api.cacheWorkout('alice',session());await api.queueSet('alice','set',{reps:9});let calls=0;
 await api.flushWorkoutDraft('alice',()=>true,{...noop,set:async(_session,_set,patch)=>{calls++;if(calls===1){assert.equal(patch.reps,9);await api.queueSet('alice','set',{reps:11});}else assert.equal(patch.reps,11);}});
 assert.equal(calls,2);assert.equal((await api.readWorkoutDraft('alice')).session.workout_session_exercises[0].workout_logged_sets[0].reps,11);
});
test('completion is sent after sets and notes, remains queued after failure, and retries without losing data',async()=>{
 const {api,storage}=setup();await api.cacheWorkout('alice',session());await api.queueSet('alice','set',{completed:true});await api.queueNotes('alice','Good session');await api.queueFinish('alice',1200);const calls=[];
 await assert.rejects(()=>api.flushWorkoutDraft('alice',()=>true,{set:async()=>calls.push('set'),notes:async()=>calls.push('notes'),finish:async()=>{calls.push('finish');throw Error('offline');}}),/offline/);
 assert.deepEqual(calls,['set','notes','finish']);assert.ok((await api.readWorkoutDraft('alice')).finish);
 await setup(storage).api.flushWorkoutDraft('alice',()=>true,{...noop,finish:async(_id,seconds,notes)=>{assert.equal(seconds,1200);assert.equal(notes,'Good session');}});assert.equal(await api.readWorkoutDraft('alice'),null);
});
test('account change stops uploads before sending and keeps the previous account journal',async()=>{
 const {api}=setup();await api.cacheWorkout('alice',session());await api.queueSet('alice','set',{reps:10});let calls=0;
 await assert.rejects(()=>api.flushWorkoutDraft('alice',()=>false,{...noop,set:async()=>calls++}),/Account changed/);assert.equal(calls,0);assert.equal(api.draftPending(await api.readWorkoutDraft('alice')),1);
});
test('corrupt persisted data is preserved and cannot be silently overwritten',async()=>{
 const {api,storage}=setup();storage.set('fitsync.workout.draft.v1.alice','{"version":99}');await assert.rejects(()=>api.cacheWorkout('alice',session()),/kept on this device/);assert.equal(storage.get('fitsync.workout.draft.v1.alice'),'{"version":99}');
});

test('finishing advances the journal revision, survives a stale refresh and preserves the original finish on retry', async () => {
 const {api}=setup(); await api.cacheWorkout('alice',session());
 await assert.rejects(api.queueFinish('alice',100), /at least one set/);
 await api.queueSet('alice','set',{completed:true});
 await api.flushWorkoutDraft('alice',()=>true,noop);
 const before=await api.readWorkoutDraft('alice');
 await api.queueFinish('alice',1200);
 const finished=await api.readWorkoutDraft('alice');
 assert.equal(finished.revision,before.revision+1);
 await api.cacheWorkout('alice',session(),before.revision);
 assert.equal((await api.readWorkoutDraft('alice')).finish.elapsedSeconds,1200);
 await api.queueFinish('alice',1500);
 assert.equal((await api.readWorkoutDraft('alice')).finish.elapsedSeconds,1200);
 await assert.rejects(api.queueSet('alice','set',{reps:15}),/reopen/i);
});
