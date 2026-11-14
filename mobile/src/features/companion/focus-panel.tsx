import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Txt } from "@/src/components/ui";
import { useBilling } from "../billing/billing-context";
import { useCoaching } from "../coaching/use-coaching";
import { type FocusInput, type FocusPreview } from "../coaching/api";
import { localDate } from "../progress/model";
import { MUSCLES } from "../pro/analytics";
import { GlassCard, ProButton, ProPill, ProSection } from "../pro/ui";
import { useCompanion } from "./companion-context";
import type { CompanionRecord } from "./api";

export function FocusPanel({ muscle: initialMuscle }: { muscle?: string }) {
  const coaching = useCoaching(),
    companion = useCompanion(),
    billing = useBilling();
  const [muscle, setMuscle] = useState(
      initialMuscle && MUSCLES.includes(initialMuscle as (typeof MUSCLES)[number])
        ? initialMuscle
        : "chest",
    ),
    [weeks, setWeeks] = useState<4 | 8>(4),
    [sets, setSets] = useState(1),
    [preview, setPreview] = useState<FocusPreview | null>(null),
    [acceptedInput, setAcceptedInput] = useState<FocusInput | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const record = companion.state.records.find(
    (r) => r.id === "focus_active" && r.kind === "specialisation",
  ) as CompanionRecord<"specialisation"> | undefined;
  const plan = coaching.data?.plan;
  const reset = () => {
    setPreview(null);
    setAcceptedInput(null);
    setNotice("");
  };
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your plan.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ProSection title="Make room for a muscle focus." eyebrow="Preview before committing" />
      {record && (
        <View className="mb-4">
          <GlassCard>
            <Txt weight="medium">Saved focus · {record.data.muscle.replace(/-/g, " ")}</Txt>
            <Txt className="mt-2 text-xs leading-5 text-muted">
              {record.data.startsOn} · {record.data.weeks} weeks · up to{" "}
              {record.data.additionalSetsPerWeek} extra sets / week. New starting plans inside these
              dates use this setting. Accepted sessions remain in your plan if you end the saved
              focus.
            </Txt>
            <ProButton
              title="End saved focus for future plans"
              secondary
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await companion.run(() => companion.api.remove(record));
                  setNotice(
                    "Future starting plans will use your ordinary preferences. Previously accepted sessions remain available for review and adaptation.",
                  );
                })
              }
            />
          </GlassCard>
        </View>
      )}
      <GlassCard>
        <Txt className="mb-4 text-sm leading-6 text-muted">
          Choose an existing primary-muscle movement to emphasise. The preview adds a small number
          of sets, preserves other exercises and shows any increase in session time. It does not
          predict recovery or a perfect training volume.
        </Txt>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {MUSCLES.map((code) => (
            <ProPill
              key={code}
              label={code.replace(/-/g, " ")}
              selected={muscle === code}
              onPress={() => {
                setMuscle(code);
                reset();
              }}
            />
          ))}
        </View>
        <Txt className="mb-2 text-xs text-muted">Focus window</Txt>
        <View className="mb-4 flex-row gap-2">
          {([4, 8] as const).map((value) => (
            <ProPill
              key={value}
              label={`${value} weeks`}
              selected={weeks === value}
              onPress={() => {
                setWeeks(value);
                reset();
              }}
            />
          ))}
        </View>
        <Txt className="mb-2 text-xs text-muted">Additional sets per seven-day block</Txt>
        <View className="mb-4 flex-row gap-2">
          {[1, 2].map((value) => (
            <ProPill
              key={value}
              label={`${value} ${value === 1 ? "set" : "sets"}`}
              selected={sets === value}
              onPress={() => {
                setSets(value);
                reset();
              }}
            />
          ))}
        </View>
        {!plan && (
          <ProButton
            title="Build a starting plan first"
            secondary
            onPress={() => router.push("/coach/setup")}
          />
        )}
        {plan && (
          <ProButton
            title="Preview focus in my actual plan"
            loading={busy}
            onPress={() => {
              if (!billing.isPro) {
                router.push("/membership");
                return;
              }
              void run(async () => {
                const data: FocusInput = {
                  planId: plan.id,
                  expectedRevisions: plan.sessions.map((day) => ({
                    id: day.id,
                    revision: day.revision,
                  })),
                  muscle,
                  startsOn: localDate(),
                  weeks,
                  additionalSetsPerWeek: sets,
                };
                const result = await coaching.mutate(
                  `focus-preview:${JSON.stringify(data)}`,
                  (id) => coaching.api.focus(data, id, true),
                );
                if (result) {
                  setPreview(result);
                  setAcceptedInput(data);
                }
              });
            }}
          />
        )}
        {preview && (
          <View className="mt-5">
            <Txt weight="medium">Your proposed changes</Txt>
            {preview.explanation.map((text, i) => (
              <Txt key={i} className="mt-2 text-xs leading-5 text-muted">
                {text}
              </Txt>
            ))}
            {preview.changes.map((change, i) => (
              <View key={`${change.dayId}:${i}`} className="mt-3 rounded-2xl bg-white/5 p-3">
                <Txt className="text-sm">
                  {change.date} · {change.exercise}
                </Txt>
                <Txt className="mt-1 text-xs text-muted">
                  {change.beforeSets} → {change.afterSets} sets · session {change.beforeMinutes} →{" "}
                  {change.afterMinutes} min
                </Txt>
              </View>
            ))}
            <ProButton
              title="Accept and sync this focus block"
              disabled={busy || !preview.changes.length}
              onPress={() =>
                void run(async () => {
                  if (!acceptedInput) return;
                  const result = await coaching.mutate(
                    `focus-apply:${JSON.stringify(acceptedInput)}`,
                    (id) => coaching.api.focus(acceptedInput, id, false),
                    (result) => result.plan,
                  );
                  if (result) {
                    reset();
                    await companion.refresh();
                    setNotice(
                      "Focus saved. Your trainer, briefing and reminders will use the accepted plan.",
                    );
                  }
                })
              }
            />
          </View>
        )}
        {!!(error || coaching.error) && (
          <Txt accessibilityRole="alert" className="mt-4 text-xs leading-5 text-red-300">
            {error || coaching.error}
          </Txt>
        )}
        {!!notice && (
          <Txt accessibilityLiveRegion="polite" className="mt-3 text-xs leading-5 text-muted">
            {notice}
          </Txt>
        )}
      </GlassCard>
    </>
  );
}
