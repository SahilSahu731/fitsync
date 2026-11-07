import React, {
  useState
} from "react";

import {
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";

import {
  useLocalSearchParams,
  useRouter
} from "expo-router";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import {
  ExploreHeader
} from "@/src/features/explore/components";

import {
  EXTRA_CALCULATORS,
  calculateExtra,
  calculatePlates,
  estimatedOneRepMax,
  warmupLoads,
  workoutVolume
} from "@/src/features/explore/tools";

import { usePublishedTools } from "@/src/features/explore/use-tools";

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <View className="mb-4">
      <Txt
        weight="semibold"
        className="mb-2 text-sm"
      >
        {label}
      </Txt>

      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        accessibilityLabel={label}
        placeholder="0"
        placeholderTextColor={C.muted}
        className="h-14 rounded-xl border border-border bg-panel px-4 text-lg text-ink"
      />
    </View>
  );
}

function Result({
  label,
  value,
  note
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <View className="mt-5 rounded-2xl bg-panel p-5">
      <Txt className="text-xs uppercase tracking-widest text-brand">
        {label}
      </Txt>

      <Txt
        weight="bold"
        className="mt-3 text-[33px]"
      >
        {value}
      </Txt>

      {note ? (
        <Txt className="mt-3 text-sm leading-6 text-muted">
          {note}
        </Txt>
      ) : null}
    </View>
  );
}

export default function ExploreCalculator() {
  const {
    slug
  } = useLocalSearchParams<{
    slug: string;
  }>();

  const router = useRouter();

  const { tools: TOOLS, loading, error, reload } = usePublishedTools();
  const tool = TOOLS.find(
    item => item.id === slug
  );

  const [weight, setWeight] = useState("60");
  const [reps, setReps] = useState("8");
  const [sets, setSets] = useState("3");

  const [bar, setBar] = useState("20");
  const [target, setTarget] = useState("80");

  const [
    increment,
    setIncrement
  ] = useState("2.5");

  if (!tool) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Txt>
          {loading ? "Loading calculator…" : error || "This calculator is not published."}
        </Txt>

        {error && <Pressable onPress={reload}><Txt className="text-brand">Retry</Txt></Pressable>}
        <Pressable
          onPress={() => router.back()}
        >
          <Txt className="mt-3 text-brand">
            Go back
          </Txt>
        </Pressable>
      </View>
    );
  }

  const load = Number(weight);
  const repCount = Number(reps);
  const setCount = Number(sets);

  const max =
    weight.trim() && reps.trim()
      ? estimatedOneRepMax(
          load,
          repCount
        )
      : null;

  const volume =
    weight.trim() &&
    reps.trim() &&
    sets.trim()
      ? workoutVolume(
          setCount,
          repCount,
          load
        )
      : null;

  const plates =
    bar.trim() && target.trim()
      ? calculatePlates(
          Number(target),
          Number(bar)
        )
      : null;

  const warmups =
    weight.trim() && increment.trim()
      ? warmupLoads(
          load,
          Number(increment)
        )
      : null;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 110
      }}
    >
      <ExploreHeader
        title={tool.name}
        subtitle={tool.description}
        onBack={() => router.back()}
      />

      {tool.cover_url && <Image source={{ uri: tool.cover_url }} style={{ width: "100%", height: 190, borderRadius: 20, marginBottom: 20 }} resizeMode="cover" accessibilityLabel={tool.name} />}
      {tool.explanation && <View className="mb-5 rounded-2xl bg-panel p-5"><Txt weight="bold">How it works</Txt><Txt className="mt-2 text-sm leading-6 text-muted">{tool.explanation}</Txt><Txt weight="bold" className="mt-4">Worked example</Txt><Txt className="mt-2 text-sm leading-6 text-muted">{tool.example}</Txt></View>}
      {tool.calculator_key && EXTRA_CALCULATORS[tool.calculator_key] && <ExtraCalculator key={tool.calculator_key} id={tool.calculator_key} />}
      {tool.calculator_key === "one-rep-max" ? (
        <>
          <NumberField
            label="Weight lifted (kg)"
            value={weight}
            onChange={setWeight}
          />

          <NumberField
            label="Repetitions (1–12)"
            value={reps}
            onChange={setReps}
          />

          <Result
            label="Estimated one-rep max"
            value={
              max === null
                ? "Enter valid values"
                : `${max.toFixed(1)} kg`
            }
            note="Uses a simplified Epley estimate for sets of 1–12 reps. It is not an instruction to attempt a maximal lift."
          />
        </>
      ) : null}

      {tool.calculator_key === "workout-volume" ? (
        <>
          <NumberField
            label="Number of sets"
            value={sets}
            onChange={setSets}
          />

          <NumberField
            label="Repetitions per set"
            value={reps}
            onChange={setReps}
          />

          <NumberField
            label="Weight per repetition (kg)"
            value={weight}
            onChange={setWeight}
          />

          <Result
            label="Total volume"
            value={
              volume === null
                ? "Enter valid values"
                : `${volume.toLocaleString()} kg`
            }
            note="Volume load is sets × reps × weight. It is just one measure of training workload."
          />
        </>
      ) : null}

      {tool.calculator_key === "plate-calculator" ? (
        <>
          <NumberField
            label="Target total weight (kg)"
            value={target}
            onChange={setTarget}
          />

          <NumberField
            label="Barbell weight (kg)"
            value={bar}
            onChange={setBar}
          />

          <Result
            label="Balanced plate loading"
            value={
              plates
                ? `${plates.actualTotal} kg total`
                : "Check weight values"
            }
            note="Assumes pairs of standard kg plates are available: 25, 20, 15, 10, 5, 2.5, 1.25. Collars are not included."
          />

          {plates ? (
            <View className="mt-5 rounded-2xl bg-panel p-5">
              <Txt
                weight="bold"
                className="mb-3 text-lg"
              >
                Each side of the bar
              </Txt>

              <View className="mb-5 flex-row items-center gap-1" accessibilityLabel="Plate arrangement on each side"><View style={{ height: 10, width: 40, backgroundColor: C.muted }} />{plates.perSide.flatMap(p => Array.from({ length: p.countPerSide }, (_, i) => <View key={`${p.weight}-${i}`} style={{ minWidth: 24, height: 45 + p.weight * 2, backgroundColor: C.brand, borderRadius: 4, justifyContent: "center", alignItems: "center" }}><Txt className="text-xs text-bg">{p.weight}</Txt></View>))}</View>
              {plates.perSide.length ? (
                plates.perSide.map(
                  plate => (
                    <Txt
                      key={plate.weight}
                      className="mb-2 text-base"
                    >
                      {plate.countPerSide} ×{" "}
                      {plate.weight} kg
                    </Txt>
                  )
                )
              ) : (
                <Txt className="text-muted">
                  Empty bar
                </Txt>
              )}

              {plates.remaining ? (
                <Txt className="mt-3 text-xs text-muted">
                  The target cannot be loaded
                  exactly with the assumed
                  plates; {plates.remaining} kg
                  per side remains.
                </Txt>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      {tool.calculator_key === "warmup-sets" ? (
        <>
          <NumberField
            label="Planned working weight (kg)"
            value={weight}
            onChange={setWeight}
          />

          <NumberField
            label="Rounding increment (kg)"
            value={increment}
            onChange={setIncrement}
          />

          <Result
            label="Example warm-up loads"
            value={
              warmups
                ? `${warmups.length} steps`
                : "Enter valid values"
            }
            note="Approximate 50%, 70% and 85% of your planned working load. Adjust or skip steps based on the lift and your experience."
          />

          {warmups ? (
            <View className="mt-5 rounded-2xl bg-panel p-5">
              {warmups.map(
                (value, index) => (
                  <View
                    key={index}
                    className="mb-3 flex-row items-center justify-between"
                  >
                    <Txt className="text-muted">
                      Step {index + 1}
                    </Txt>

                    <Txt weight="bold">
                      {value.toFixed(1)} kg
                    </Txt>
                  </View>
                )
              )}
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
function ExtraCalculator({ id }: { id: string }) {
  const definition = EXTRA_CALCULATORS[id];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(definition.fields.map(f => [f.key, f.initial])));
  const result = calculateExtra(id, values);
  return <View>{definition.fields.map(f => f.key === "direction" ? <View key={f.key} className="mb-5 flex-row gap-3">{["1", "2"].map(direction => <Pressable key={direction} accessibilityRole="button" accessibilityState={{ selected: values.direction === direction }} onPress={() => setValues(v => ({ ...v, direction }))} className={`flex-1 rounded-xl p-4 ${values.direction === direction ? "bg-brand" : "bg-panel"}`}><Txt weight="bold" className={values.direction === direction ? "text-bg" : "text-ink"}>{id === "weight-converter" ? direction === "1" ? "kg → lb" : "lb → kg" : direction === "1" ? "km → miles" : "miles → km"}</Txt></Pressable>)}</View> : <NumberField key={f.key} label={f.label} value={values[f.key]} onChange={next => setValues(v => ({ ...v, [f.key]: next }))} />)}<Result label="Result" value={result ?? "Enter valid values"} /></View>;
}
