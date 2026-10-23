import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const root = path.resolve(import.meta.dirname, '..');
function setup(granted = true) {
  const calls = []; const storage = new Map();
  const notifications = {
    AndroidImportance: { HIGH: 4 }, SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    setNotificationHandler: () => {},
    setNotificationChannelAsync: async (...args) => calls.push(['channel', ...args]),
    getPermissionsAsync: async () => ({ granted }),
    requestPermissionsAsync: async () => ({ granted }),
    scheduleNotificationAsync: async value => { calls.push(['schedule', value]); return value.identifier; },
    cancelScheduledNotificationAsync: async id => calls.push(['cancel', id]),
  };
  const source = fs.readFileSync(path.join(root, 'src/features/workouts/notifications.ts'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: name => {
    if (name === 'expo-notifications') return notifications;
    if (name === 'react-native') return { Platform: { OS: 'android' } };
    if (name === '@react-native-async-storage/async-storage') return { getItem: async key => storage.get(key) ?? null, setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key) };
    throw new Error(name);
  } });
  return { api: exports, calls };
}
test('channel and scheduled sound match the bundled WAV and plugin config', async () => {
  const { api, calls } = setup(); await api.scheduleRestNotification(30);
  const [, channelId, channel] = calls.find(c => c[0] === 'channel');
  const [, scheduled] = calls.find(c => c[0] === 'schedule');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo.plugins.find(p => Array.isArray(p) && p[0] === 'expo-notifications')[1];
  assert.equal(channelId, config.defaultChannel);
  assert.equal(scheduled.trigger.channelId, channelId);
  assert.equal(channel.sound, scheduled.content.sound);
  const asset = config.sounds.find(p => path.basename(p) === channel.sound);
  assert.ok(asset);
  const wav = fs.readFileSync(path.join(root, asset));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.ok(wav.length > 44);
});
test('denied permission skips scheduling and rapid stop cancels the scheduled ID', async () => {
  const denied = setup(false); await denied.api.scheduleRestNotification(30);
  assert.equal(denied.calls.some(c => c[0] === 'schedule'), false);
  const allowed = setup(); await Promise.all([allowed.api.scheduleRestNotification(30), allowed.api.cancelRestNotification()]);
  const scheduled = allowed.calls.find(c => c[0] === 'schedule')[1];
  assert.equal(allowed.calls.at(-1)[0], 'cancel');
  assert.equal(allowed.calls.at(-1)[1], scheduled.identifier);
});
