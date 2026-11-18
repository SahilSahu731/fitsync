import test from "node:test";
import assert from "node:assert/strict";
import {
  homeReminderDraft,
  homeReminderPreferences,
  validHomeReminderDraft,
} from "../src/features/home/reminder-settings.ts";

const preferences = () => ({
  enabled: true,
  time: "18:00",
  days: [1, 3, 5],
  quietStart: "22:30",
  quietEnd: "07:15",
  snoozeMinutes: 45,
  timezone: "Asia/Kolkata",
  habits: {
    hydration: { enabled: true, time: "14:30" },
    meals: { enabled: false, time: "12:45" },
    sleep: { enabled: true, time: "21:15" },
  },
});
const enrollment = {
  reminder_enabled: true,
  reminder_hour: 6,
  reminder_minute: 5,
};

test("Home draft uses personal workout settings and habit defaults without a program", () => {
  const prefs = preferences();
  delete prefs.habits;
  const draft = homeReminderDraft(prefs, null, false);
  assert.deepEqual(draft, {
    workout: { enabled: true, time: "18:00" },
    water: { enabled: false, time: "15:00" },
    diet: { enabled: false, time: "12:00" },
    days: [1, 3, 5],
  });
  draft.days.push(7);
  assert.deepEqual(prefs.days, [1, 3, 5]);
});

test("Program workout state uses enrollment time and global workout consent", () => {
  const prefs = preferences();
  assert.deepEqual(homeReminderDraft(prefs, enrollment, true).workout, {
    enabled: true,
    time: "06:05",
  });
  assert.equal(homeReminderDraft(prefs, enrollment, false).workout.enabled, false);
  assert.equal(
    homeReminderDraft(prefs, { ...enrollment, reminder_enabled: false }, true).workout.enabled,
    false,
  );
});

test("Saving Home settings preserves quiet hours, timezone, snooze and sleep", () => {
  const base = preferences();
  const draft = homeReminderDraft(base, null, true);
  draft.workout = { enabled: false, time: "19:10" };
  draft.days = [2, 4, 6];
  draft.water = { enabled: false, time: "16:00" };
  draft.diet = { enabled: true, time: "13:20" };
  const next = homeReminderPreferences(base, draft, false);
  assert.equal(next.enabled, false);
  assert.equal(next.time, "19:10");
  assert.deepEqual(next.days, [2, 4, 6]);
  assert.equal(next.quietStart, base.quietStart);
  assert.equal(next.quietEnd, base.quietEnd);
  assert.equal(next.timezone, base.timezone);
  assert.equal(next.snoozeMinutes, base.snoozeMinutes);
  assert.deepEqual(next.habits.sleep, base.habits.sleep);
  assert.deepEqual(next.habits.hydration, draft.water);
  assert.deepEqual(next.habits.meals, draft.diet);
  next.days.push(7);
  next.habits.hydration.enabled = true;
  assert.deepEqual(base.days, [1, 3, 5]);
  assert.deepEqual(draft.days, [2, 4, 6]);
  assert.equal(draft.water.enabled, false);
});

test("Program mode disables personal training without overwriting its saved time or days", () => {
  const base = preferences();
  const draft = homeReminderDraft(base, enrollment, true);
  draft.workout.time = "08:40";
  draft.days = [];
  const next = homeReminderPreferences(base, draft, true);
  assert.equal(next.enabled, false);
  assert.equal(next.time, "18:00");
  assert.deepEqual(next.days, [1, 3, 5]);
  assert.equal(validHomeReminderDraft(base, draft, true), true);
});

test("Draft validates all visible times, including program time and disabled reminders", () => {
  const base = preferences();
  const valid = homeReminderDraft(base, null, true);
  for (const hasProgram of [false, true]) {
    assert.equal(validHomeReminderDraft(base, valid, hasProgram), true);
    for (const kind of ["workout", "water", "diet"]) {
      for (const time of ["24:00", "12:60", "9:00", "06:00x", ""]) {
        const draft = structuredClone(valid);
        draft[kind] = { enabled: false, time };
        assert.equal(validHomeReminderDraft(base, draft, hasProgram), false, `${kind}: ${time}`);
      }
    }
  }
});

test("Personal training needs valid selected days only while enabled", () => {
  const base = preferences();
  const draft = homeReminderDraft(base, null, true);
  draft.days = [];
  assert.equal(validHomeReminderDraft(base, draft, false), false);
  draft.workout.enabled = false;
  assert.equal(validHomeReminderDraft(base, draft, false), true);
  for (const days of [[1, 1], [0], [8], [1.5]]) {
    draft.days = days;
    assert.equal(validHomeReminderDraft(base, draft, false), false);
  }
});
