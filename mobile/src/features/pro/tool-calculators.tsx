import React, { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Line, Rect } from "react-native-svg";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { useSession } from "@/src/context/session";
import { Sheet } from "../progress/editors";
import {
  calculateWarmup,
  DEFAULT_RAMPS,
  estimateOneRepMax,
  fromKg,
  numeric,
  parsePlates,
  toKg,
  type Plate,
} from "./training-model";

type Unit = "kg" | "lb";
type PlateDraft = { id: number; weight: string; count: string };
const loadLabel = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const platePreset = (unit: Unit): PlateDraft[] =>
  (unit === "kg" ? [20, 10, 5, 2.5, 1.25] : [45, 25, 10, 5, 2.5]).map((weight, id) => ({
    id,
    weight: String(weight),
    count: id === 0 ? "2" : "1",
  }));
const stagePreset = () =>
  DEFAULT_RAMPS.map((r) => ({ percent: String(r.percent), reps: String(r.reps) }));

function UnitPicker({ unit, onChange }: { unit: Unit; onChange: (unit: Unit) => void }) {
  return (
    <View className="flex-row rounded-full bg-black/40 p-1">
      {(["kg", "lb"] as const).map((value) => (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={`Use ${value}`}
          accessibilityState={{ selected: unit === value }}
          onPress={() => onChange(value)}
          className={`min-h-11 min-w-12 items-center justify-center rounded-full px-3 ${unit === value ? "bg-white" : ""}`}
        >
          <Txt
            weight="medium"
            className={`text-xs ${unit === value ? "text-black" : "text-muted"}`}
          >
            {value}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  placeholder = "0",
  large = false,
  integer = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  placeholder?: string;
  large?: boolean;
  integer?: boolean;
}) {
  return (
    <View className="min-w-0 flex-1">
      <View
        className={`flex-row items-center gap-2 ${large ? "" : "rounded-2xl border border-white/10 bg-black/25 px-3"}`}
      >
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          keyboardType={integer ? "number-pad" : "decimal-pad"}
          autoCorrect={false}
          autoComplete="off"
          maxLength={integer ? 2 : 12}
          placeholder={placeholder}
          placeholderTextColor="#555555"
          selectionColor="#FFFFFF"
          underlineColorAndroid="transparent"
          className={`min-w-0 flex-1 font-poppins-medium text-white ${large ? "min-h-20 text-[46px] tracking-[-2px]" : "min-h-14 text-base"}`}
          style={{ paddingVertical: large ? 4 : 12, fontVariant: ["tabular-nums"] }}
        />
        {suffix && (
          <Txt className={large ? "text-2xl text-muted" : "text-xs text-muted"}>{suffix}</Txt>
        )}
      </View>
    </View>
  );
}

function Disclosure({
  title,
  summary,
  icon,
  open,
  onPress,
  children,
}: {
  title: string;
  summary: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={onPress}
        className="min-h-20 flex-row items-center gap-3 px-4 py-3"
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/5">
          <MaterialCommunityIcons name={icon} size={20} color="#FFFFFF" />
        </View>
        <View className="min-w-0 flex-1">
          <Txt weight="medium" className="text-sm">
            {title}
          </Txt>
          <Txt className="mt-1 text-[11px] leading-[18px] text-muted">{summary}</Txt>
        </View>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color="#A3A3A3"
        />
      </Pressable>
      {open && <View className="gap-4 border-t border-white/5 p-4">{children}</View>}
    </View>
  );
}

function Done({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Done"
      onPress={onPress}
      className="min-h-14 flex-row items-center justify-center gap-2 rounded-full bg-white px-5 py-3"
    >
      <MaterialCommunityIcons name="check" size={20} color="#000000" />
      <Txt weight="semibold" className="text-sm text-black">
        Done
      </Txt>
    </Pressable>
  );
}

function Note({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <View className="flex-row items-start gap-2">
      <MaterialCommunityIcons
        name={error ? "alert-circle-outline" : "information-outline"}
        size={16}
        color="#A3A3A3"
        style={{ marginTop: 2 }}
      />
      <Txt
        accessibilityRole={error ? "alert" : undefined}
        className="min-w-0 flex-1 text-[11px] leading-5 text-muted"
      >
        {children}
      </Txt>
    </View>
  );
}

/** Both sleeves mirror the calculated per-side inventory, including repeated plates. */
function Barbell({ plates = [] }: { plates?: Plate[] }) {
  const weights = plates.flatMap((p) => Array.from({ length: p.count }, () => p.weight));
  const step = Math.min(13, 72 / Math.max(1, weights.length));
  return (
    <Svg width="100%" height={120} viewBox="0 0 320 120" accessible={false}>
      <Line x1={16} y1={108} x2={304} y2={108} stroke="#FFFFFF0D" />
      <Rect x={14} y={55} width={292} height={10} rx={3} fill="#797979" />
      <Rect x={100} y={57} width={120} height={6} rx={3} fill="#D4D4D4" />
      {Array.from({ length: 18 }, (_, i) => (
        <Line
          key={i}
          x1={110 + i * 6}
          y1={58}
          x2={112 + i * 6}
          y2={62}
          stroke="#737373"
          strokeWidth={0.7}
        />
      ))}
      <Rect x={87} y={49} width={8} height={22} rx={2} fill="#EEEEEE" />
      <Rect x={225} y={49} width={8} height={22} rx={2} fill="#EEEEEE" />
      {weights.map((weight, i) => {
        const height = 30 + Math.sqrt(weight / 100) * 58;
        return (
          <React.Fragment key={i}>
            {[86 - step * (i + 1), 234 + step * i].map((x) => (
              <Rect
                key={x}
                x={x}
                y={60 - height / 2}
                width={Math.max(0.4, step - 2)}
                height={height}
                rx={Math.min(3, step / 3)}
                fill={i % 2 ? "#A3A3A3" : "#E8E8E8"}
                stroke="#FFFFFF"
                strokeWidth={0.4}
              />
            ))}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function WarmupCalculator({
  onClose,
  initialLoadKg,
  exerciseName,
}: {
  onClose: () => void;
  initialLoadKg?: number;
  exerciseName?: string;
}) {
  const { settings } = useSession();
  const [unit, setUnit] = useState<Unit>(settings?.weightUnit ?? "kg");
  const [target, setTarget] = useState(() =>
    initialLoadKg !== undefined && Number.isFinite(initialLoadKg) && initialLoadKg > 0
      ? String(Math.round(fromKg(initialLoadKg, unit) * 100) / 100)
      : "",
  );
  const [bar, setBar] = useState(unit === "kg" ? "20" : "45");
  const [increment, setIncrement] = useState(unit === "kg" ? "2.5" : "5");
  const [plates, setPlates] = useState(() => platePreset(unit));
  const [ramps, setRamps] = useState(stagePreset);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [unitChanged, setUnitChanged] = useState(false);
  const result = useMemo(() => {
    if (!target.trim()) return { data: null, error: "" };
    try {
      const load = numeric(target),
        barWeight = numeric(bar),
        step = numeric(increment);
      if (load === null || barWeight === null || step === null)
        throw new Error("Enter a valid working load, bar weight and rounding increment.");
      const inventory = parsePlates(plates.map((p) => `${p.weight}x${p.count}`).join(","));
      return {
        data: calculateWarmup(
          load,
          barWeight,
          inventory,
          step,
          ramps.map((r) => ({
            percent: numeric(r.percent) ?? NaN,
            reps: numeric(r.reps) ?? NaN,
          })),
        ),
        error: "",
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : "Check your inputs." };
    }
  }, [target, bar, increment, plates, ramps]);
  const activeIndex = Math.min(selected, Math.max(0, (result.data?.sets.length ?? 1) - 1));
  const activeSet = result.data?.sets[activeIndex];
  const changeUnit = (value: Unit) => {
    if (value === unit) return;
    const load = numeric(target);
    if (load !== null) setTarget(String(Math.round(fromKg(toKg(load, unit), value) * 100) / 100));
    setUnit(value);
    setBar(value === "kg" ? "20" : "45");
    setIncrement(value === "kg" ? "2.5" : "5");
    setPlates(platePreset(value));
    setUnitChanged(true);
  };
  return (
    <Sheet
      title="Warm-up & plates"
      eyebrow="STUDIO / TRAINING TOOLS"
      subtitle="A smoother start to your working sets."
      onClose={onClose}
      footer={<Done onPress={onClose} />}
    >
      <View className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <View className="flex-row items-center justify-between gap-2">
          <Txt weight="medium" className="min-w-0 flex-1 text-[10px] tracking-[1.5px] text-muted">
            WORKING WEIGHT
          </Txt>
          <UnitPicker unit={unit} onChange={changeUnit} />
        </View>
        <NumberField
          large
          label={`Working load · ${unit}`}
          value={target}
          onChange={setTarget}
          suffix={unit}
        />
        <Txt className="text-xs leading-5 text-muted">Total weight, including the bar.</Txt>
        {!!exerciseName &&
          initialLoadKg !== undefined &&
          initialLoadKg > 0 &&
          Number.isFinite(initialLoadKg) && (
            <View className="mt-4 flex-row items-start gap-2 border-t border-white/10 pt-3">
              <MaterialCommunityIcons name="bookmark-outline" size={16} color="#FFFFFF" />
              <Txt className="min-w-0 flex-1 text-[11px] leading-5 text-muted">
                From your saved target · {exerciseName}
              </Txt>
            </View>
          )}
      </View>
      <View className="mt-3 gap-3">
        <Disclosure
          title="Equipment"
          icon="dumbbell"
          open={equipmentOpen}
          onPress={() => setEquipmentOpen(!equipmentOpen)}
          summary={`${bar || "—"} ${unit} bar · ${plates.length} plate sizes`}
        >
          <View className="flex-row gap-3">
            <View className="min-w-0 flex-1 gap-2">
              <Txt className="text-[11px] text-muted">Bar weight</Txt>
              <NumberField
                label={`Bar weight · ${unit}`}
                value={bar}
                onChange={setBar}
                suffix={unit}
              />
            </View>
            <View className="min-w-0 flex-1 gap-2">
              <Txt className="text-[11px] text-muted">Round down by</Txt>
              <NumberField
                label={`Round down by · ${unit}`}
                value={increment}
                onChange={setIncrement}
                suffix={unit}
              />
            </View>
          </View>
          <View>
            <Txt weight="medium" className="text-sm">
              Your available plates
            </Txt>
            <Txt className="mt-1 text-[11px] leading-5 text-muted">
              Enter the count on one side of the bar.
            </Txt>
          </View>
          <View className="flex-row gap-3 pr-12">
            <Txt className="flex-1 text-[10px] text-muted">WEIGHT / {unit.toUpperCase()}</Txt>
            <Txt className="flex-1 text-[10px] text-muted">COUNT / SIDE</Txt>
          </View>
          <View className="gap-2">
            {plates.map((p, i) => (
              <View key={p.id} className="flex-row items-center gap-3">
                <NumberField
                  label={`Plate ${i + 1} weight · ${unit}`}
                  value={p.weight}
                  onChange={(weight) =>
                    setPlates((rows) =>
                      rows.map((row) => (row.id === p.id ? { ...row, weight } : row)),
                    )
                  }
                />
                <NumberField
                  integer
                  label={`Plate ${i + 1} count per side`}
                  value={p.count}
                  onChange={(count) =>
                    setPlates((rows) =>
                      rows.map((row) => (row.id === p.id ? { ...row, count } : row)),
                    )
                  }
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove plate ${i + 1}`}
                  onPress={() => setPlates((rows) => rows.filter((row) => row.id !== p.id))}
                  className="h-11 w-11 items-center justify-center rounded-full"
                >
                  <MaterialCommunityIcons name="minus-circle-outline" size={20} color="#A3A3A3" />
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add plate size"
            disabled={plates.length >= 12}
            accessibilityState={{ disabled: plates.length >= 12 }}
            onPress={() =>
              setPlates((rows) => [
                ...rows,
                { id: Math.max(-1, ...rows.map((row) => row.id)) + 1, weight: "", count: "1" },
              ])
            }
            className="min-h-11 flex-row items-center justify-center gap-2 rounded-full border border-white/10"
            style={{ opacity: plates.length >= 12 ? 0.4 : 1 }}
          >
            <MaterialCommunityIcons name="plus" size={17} color="#FFFFFF" />
            <Txt className="text-xs">Add plate size</Txt>
          </Pressable>
          <Note>
            Switching units converts your working weight and resets the bar and plates to standard
            equipment. Adjust them to match your gym.
          </Note>
        </Disclosure>
        <Disclosure
          title="Warm-up stages"
          icon="stairs-up"
          open={stagesOpen}
          onPress={() => setStagesOpen(!stagesOpen)}
          summary={ramps.map((r) => `${r.percent || "—"}%`).join("  /  ")}
        >
          <Txt className="text-[11px] leading-5 text-muted">
            Choose each percentage and rep count. Matching achievable loads are combined.
          </Txt>
          <View className="flex-row gap-3 pl-8">
            <Txt className="flex-1 text-[10px] text-muted">WORKING WEIGHT %</Txt>
            <Txt className="flex-1 text-[10px] text-muted">REPETITIONS</Txt>
          </View>
          {ramps.map((r, i) => (
            <View key={i} className="flex-row items-center gap-3">
              <Txt className="w-5 text-xs text-muted">{String(i + 1).padStart(2, "0")}</Txt>
              <NumberField
                label={`Stage ${i + 1} percent`}
                value={r.percent}
                suffix="%"
                onChange={(percent) =>
                  setRamps((rows) =>
                    rows.map((row, idx) => (idx === i ? { ...row, percent } : row)),
                  )
                }
              />
              <NumberField
                integer
                label={`Stage ${i + 1} repetitions`}
                value={r.reps}
                onChange={(reps) =>
                  setRamps((rows) => rows.map((row, idx) => (idx === i ? { ...row, reps } : row)))
                }
              />
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset warm-up stages"
            onPress={() => setRamps(stagePreset())}
            className="min-h-11 items-center justify-center"
          >
            <Txt className="text-xs text-muted">Reset stages</Txt>
          </Pressable>
        </Disclosure>
      </View>
      {unitChanged && (
        <View className="mt-4">
          <Note>Working weight converted. Standard {unit} bar and plates selected.</Note>
        </View>
      )}
      {!!result.error && (
        <View className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4">
          <Note error>{result.error}</Note>
        </View>
      )}
      {!target.trim() && (
        <View className="mb-2 mt-7 items-center rounded-[28px] border border-dashed border-white/10 px-5 pb-6">
          <Barbell />
          <Txt weight="medium" className="text-base">
            Your warm-up starts here.
          </Txt>
          <Txt className="mt-2 text-center text-xs leading-5 text-muted">
            Enter your working weight to see your sets and exactly what to load.
          </Txt>
        </View>
      )}
      {result.data && (
        <View className="mt-7">
          <View className="mb-4 flex-row items-center justify-between gap-3">
            <Txt
              accessibilityRole="header"
              weight="medium"
              className="flex-1 text-xl tracking-[-0.5px]"
            >
              Your warm-up
            </Txt>
            <Txt className="text-xs text-muted">{result.data.sets.length} sets</Txt>
          </View>
          {activeSet && !result.data.noBar && (
            <View className="mb-3 rounded-[26px] border border-white/10 bg-black/25 px-4 pb-5 pt-4">
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Txt className="text-[10px] tracking-[1px] text-muted">LOAD EACH SIDE</Txt>
                <Txt className="text-[11px] text-muted">
                  Set {activeIndex + 1} · {loadLabel(activeSet.actual)} {unit} total
                </Txt>
              </View>
              <Barbell plates={activeSet.perSide} />
              <View className="flex-row flex-wrap justify-center gap-2">
                {activeSet.perSide.length ? (
                  activeSet.perSide.map((p) => (
                    <View
                      key={p.weight}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <Txt className="text-xs">
                        {p.count} × {loadLabel(p.weight)} {unit}
                      </Txt>
                    </View>
                  ))
                ) : (
                  <Txt className="text-xs text-muted">Empty bar · no plates needed</Txt>
                )}
              </View>
              <Txt className="mt-3 text-center text-[10px] leading-5 text-muted">
                Tap a set below to see its plates.
              </Txt>
            </View>
          )}
          {result.data.noBar && (
            <View className="mb-4">
              <Note>
                Working weight is at or below your bar. Use a lighter implement or unloaded
                practice. Check that the suggested weights are available.
              </Note>
            </View>
          )}
          <View className="gap-2">
            {result.data.sets.map((s, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`View warm-up set ${i + 1}`}
                accessibilityHint={`${loadLabel(s.actual)} ${unit}, ${s.reps} repetitions. ${result.data!.noBar ? "Lighter implement; check availability." : "Shows the plates to load on each side."}`}
                accessibilityState={{ selected: activeIndex === i }}
                onPress={() => setSelected(i)}
                className="rounded-[22px] border p-4"
                style={{
                  backgroundColor: activeIndex === i ? "#FFFFFF0B" : "#FFFFFF03",
                  borderColor: activeIndex === i ? "#FFFFFF60" : "#FFFFFF0F",
                }}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-full ${activeIndex === i ? "bg-white" : "bg-white/5"}`}
                  >
                    <Txt
                      weight="medium"
                      className={`text-xs ${activeIndex === i ? "text-black" : "text-muted"}`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </Txt>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Txt weight="medium" className="text-xl tracking-[-0.5px]">
                      {loadLabel(s.actual)} <Txt className="text-xs text-muted">{unit}</Txt>
                    </Txt>
                    <Txt className="mt-1 text-[10px] leading-4 text-muted">
                      {loadLabel(s.actualPercent)}% of working weight
                    </Txt>
                  </View>
                  <View className="items-end">
                    <Txt weight="medium" className="text-xl">
                      {s.reps}
                    </Txt>
                    <Txt className="text-[10px] text-muted">reps</Txt>
                  </View>
                </View>
                {s.residual > 0.001 && (
                  <Txt className="mt-3 text-[10px] leading-5 text-muted">
                    Rounded down from {loadLabel(s.desired)} {unit} to fit your plates.
                  </Txt>
                )}
              </Pressable>
            ))}
          </View>
          {!result.data.sets.length && (
            <Txt className="text-xs leading-5 text-muted">
              No lighter stages fit. Try a smaller rounding increment or a lighter implement.
            </Txt>
          )}
          <View className="mt-5">
            <Note>
              Adjust the stages to your exercise and comfort. These are practice sets; they are not
              added to your workout.
            </Note>
          </View>
        </View>
      )}
    </Sheet>
  );
}

export function OneRepMax({ onClose }: { onClose: () => void }) {
  const { settings } = useSession();
  const [unit, setUnit] = useState<Unit>(settings?.weightUnit ?? "kg");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("8");
  const [formulasOpen, setFormulasOpen] = useState(false);
  let result: ReturnType<typeof estimateOneRepMax> | null = null,
    error = "";
  if (weight.trim()) {
    try {
      result = estimateOneRepMax(numeric(weight) ?? NaN, numeric(reps) ?? NaN);
    } catch (e) {
      error = e instanceof Error ? e.message : "Check your inputs.";
    }
  }
  return (
    <Sheet
      title="Strength estimate"
      eyebrow="STUDIO / TRAINING TOOLS"
      subtitle="See what one completed set can tell you."
      onClose={onClose}
      footer={<Done onPress={onClose} />}
    >
      <View className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <View className="flex-row items-center gap-2">
          <Txt weight="medium" className="min-w-0 flex-1 text-[10px] tracking-[1.5px] text-muted">
            WEIGHT LIFTED
          </Txt>
          <UnitPicker
            unit={unit}
            onChange={(value) => {
              if (value === unit) return;
              const load = numeric(weight);
              if (load !== null)
                setWeight(String(Math.round(fromKg(toKg(load, unit), value) * 100) / 100));
              setUnit(value);
            }}
          />
        </View>
        <NumberField
          large
          label={`Weight · ${unit}`}
          value={weight}
          onChange={setWeight}
          suffix={unit}
        />
        <View className="mt-3 flex-row items-center gap-4 border-t border-white/10 pt-4">
          <View className="min-w-0 flex-1">
            <Txt weight="medium" className="text-sm">
              Completed reps
            </Txt>
            <Txt className="mt-1 text-[11px] leading-5 text-muted">Use a set of 1–12 reps.</Txt>
          </View>
          <View className="w-20">
            <NumberField integer label="Completed repetitions" value={reps} onChange={setReps} />
          </View>
        </View>
      </View>
      {!!error && (
        <View className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4">
          <Note error>{error}</Note>
        </View>
      )}
      {result ? (
        <View className="mt-6">
          <Txt className="mb-3 text-[10px] tracking-[1.5px] text-muted">ESTIMATED ONE-REP MAX</Txt>
          <View className="gap-3">
            {(
              [
                ["Epley", result.epley],
                ["Brzycki", result.brzycki],
              ] as const
            ).map(([name, value], i) => (
              <View
                key={name}
                className={`rounded-[26px] border p-5 ${i === 0 ? "border-white bg-white" : "border-white/10 bg-white/[0.03]"}`}
              >
                <View className="flex-row items-center justify-between gap-3">
                  <Txt
                    weight="medium"
                    className={`text-sm ${i === 0 ? "text-black" : "text-white"}`}
                  >
                    {name}
                  </Txt>
                  <MaterialCommunityIcons
                    name="trending-up"
                    size={21}
                    color={i === 0 ? "#000000" : "#A3A3A3"}
                  />
                </View>
                <View className="mt-3 flex-row flex-wrap items-baseline gap-x-2">
                  <Txt
                    weight="medium"
                    className={`text-[40px] leading-[56px] tracking-[-1.5px] ${i === 0 ? "text-black" : "text-white"}`}
                  >
                    {loadLabel(value)}
                  </Txt>
                  <Txt className={`text-lg ${i === 0 ? "text-black/60" : "text-muted"}`}>
                    {unit}
                  </Txt>
                </View>
                <Txt
                  className={`mt-1 text-[11px] leading-5 ${i === 0 ? "text-black/60" : "text-muted"}`}
                >
                  From {loadLabel(numeric(weight)!)} {unit} × {reps} reps
                </Txt>
              </View>
            ))}
          </View>
        </View>
      ) : !weight.trim() ? (
        <View className="mt-6 items-center rounded-[28px] border border-dashed border-white/10 p-6">
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-white/5">
            <MaterialCommunityIcons name="trending-up" size={26} color="#FFFFFF" />
          </View>
          <Txt weight="medium" className="text-base">
            Put your set in perspective.
          </Txt>
          <Txt className="mt-2 text-center text-xs leading-5 text-muted">
            Add the weight you lifted. Two formulas will estimate your one-rep max.
          </Txt>
        </View>
      ) : null}
      <View className="mt-5">
        <Disclosure
          title="How it is calculated"
          summary="Two formulas, one completed set"
          icon="calculator-variant-outline"
          open={formulasOpen}
          onPress={() => setFormulasOpen(!formulasOpen)}
        >
          <Txt className="text-xs leading-6 text-muted">
            Epley: load × (1 + reps / 30).{"\n"}Brzycki: load × 36 / (37 − reps).{"\n"}For one rep,
            both use your entered load.
          </Txt>
        </Disclosure>
      </View>
      <View className="mt-5">
        <Note>
          Estimates vary with exercise, technique and fatigue. This is a reference for your
          training, not a weight to attempt.
        </Note>
      </View>
    </Sheet>
  );
}
