import { writeFile, mkdir } from "node:fs/promises";
const output = new URL("../assets/sound/", import.meta.url);
await mkdir(output, { recursive: true });
const sampleRate = 44100;
for (const [name, notes, duration] of [
  ["set-saved", [740, 988], 0.16],
  ["workout-complete", [523.25, 659.25, 783.99, 1046.5], 0.64],
]) {
  const count = Math.floor(sampleRate * duration);
  const wav = Buffer.alloc(44 + count * 2);
  wav.write("RIFF"); wav.writeUInt32LE(36 + count * 2, 4); wav.write("WAVE", 8);
  wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const time = i / sampleRate;
    const noteDuration = duration / notes.length;
    const note = Math.min(notes.length - 1, Math.floor(time / noteDuration));
    const within = time - note * noteDuration;
    const envelope = Math.min(1, within / 0.008) * Math.pow(Math.max(0, 1 - within / noteDuration), 2);
    const value = Math.sin(2 * Math.PI * notes[note] * within) * envelope * 0.25;
    wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  await writeFile(new URL(`${name}.wav`, output), wav);
}
console.log("Generated original, quiet set and workout completion cues.");
