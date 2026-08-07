const test=require('node:test');
const assert=require('node:assert/strict');
const flow=require('../js/checkout-success');

test('successful checkout waits for audio completion before clean redirect',async()=>{
  const events=[];
  const manager={
    suppressNextUserNotificationSound:(key,id)=>events.push(['suppress',key,id]),
    playUserNotificationSoundAndWait:async()=>{events.push(['audio-start']);await Promise.resolve();events.push(['audio-ended']);}
  };
  flow.begin(manager);
  await flow.complete(manager,42,path=>events.push(['redirect',path]));
  assert.deepEqual(events.at(-2),['audio-ended']);
  assert.deepEqual(events.at(-1),['redirect','/orders']);
});

test('blocked or failed playback never blocks redirect',async()=>{
  const paths=[];
  await flow.complete({playUserNotificationSoundAndWait:()=>Promise.reject(new Error('blocked'))},7,path=>paths.push(path));
  assert.deepEqual(paths,['/orders']);
});

test('failed order can clear suppression without sound or redirect',()=>{
  const events=[];
  flow.begin({suppressNextUserNotificationSound:key=>events.push(['begin',key])});
  flow.cancel({clearSuppressedUserNotificationSound:key=>events.push(['cancel',key])});
  assert.deepEqual(events,[['begin','order_submitted'],['cancel','order_submitted']]);
});
