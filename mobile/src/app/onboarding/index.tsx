import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Keyboard,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSession } from "@/src/context/session";
import { C } from "@/src/constants/theme";
import {
  GoalStep,
  ExperienceStep,
  EquipmentStep,
} from "@/src/components/onboarding/choice-steps";
import { MeasurementStep } from "@/src/components/onboarding/measurement-step";
import { RoutineStep } from "@/src/components/onboarding/routine-step";
import { AboutStep } from "@/src/components/onboarding/about-step";
import { ReviewStep } from "@/src/components/onboarding/review-step";
import { StepShell } from "@/src/components/onboarding/step-shell";
import { CompletionScreen } from "@/src/components/onboarding/completion-screen";
import { useOnboardingDraft } from "@/src/components/onboarding/use-onboarding-draft";
import { STEPS, type Draft } from "@/src/components/onboarding/config";

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, settings, saveProfile } = useSession();
  const { draft, setDraft, loaded, clearDraft } = useOnboardingDraft(user?.id);
  const [step, setStep] = useState(0);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">(
    settings?.weightUnit ?? "kg",
  );
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const transitionInFlight = useRef(false);
  const [complete, setComplete] = useState(false);
  const saveInFlight = useRef(false);
  const finalStep = STEPS.length - 1;

  // Keep the button busy while the next screen's entrance animation runs.
  useEffect(() => {
    if (!transitioning) return;
    const timer = setTimeout(() => {
      transitionInFlight.current = false;
      setTransitioning(false);
    }, 240);
    return () => clearTimeout(timer);
  }, [transitioning]);

  function transitionTo(nextStep: number) {
    if (transitionInFlight.current || saveInFlight.current) return;
    transitionInFlight.current = true;
    setTransitioning(true);
    setStep(nextStep);
  }

  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (saving || transitioning || complete) return true;
      if (editing) {
        setEditing(false);
        setStep(finalStep);
        return true;
      }
      if (step > 0) {
        setStep(step - 1);
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [step, editing, saving, transitioning, complete, finalStep]);

  function update(patch: Partial<Draft>) {
    setDraft((previous) => ({ ...previous, ...patch }));
  }
  function choose(patch: Partial<Draft>) {
    update(patch);
    void Haptics.selectionAsync().catch(() => {});
  }
  function back() {
    if (transitionInFlight.current || saveInFlight.current) return;
    Keyboard.dismiss();
    if (editing) {
      setEditing(false);
      setStep(finalStep);
    } else setStep((previous) => Math.max(0, previous - 1));
  }
  async function next() {
    Keyboard.dismiss();
    if (saveInFlight.current || transitionInFlight.current) return;
    void Haptics.selectionAsync().catch(() => {});
    if (editing) {
      setEditing(false);
      transitionTo(finalStep);
      return;
    }
    if (step < finalStep) {
      transitionTo(step + 1);
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    try {
      await saveProfile({ ...draft, completedAt: new Date().toISOString() });
      setComplete(true);
      void clearDraft();
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    } catch (error) {
      Alert.alert(
        "Your setup hasn’t been saved yet",
        error instanceof Error
          ? error.message
          : "Please try again. Your choices are still here.",
      );
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }
  if (!loaded)
    return (
      <View
        className="flex-1 items-center justify-center bg-bg"
      >
        <ActivityIndicator
          color={C.brand}
          accessibilityLabel="Loading your setup"
        />
      </View>
    );
  if (complete)
    return (
      <CompletionScreen
        draft={draft}
        onContinue={() => router.replace("/(tabs)")}
      />
    );
  const props = { draft, update: choose };
  return (
    <StepShell
      step={step}
      editing={editing}
      saving={saving}
      transitioning={transitioning}
      onBack={back}
      onNext={next}
      onSkip={() => {
        if (transitionInFlight.current || saveInFlight.current) return;
        update({ gender: "prefer_not_to_say", bodyType: null });
        transitionTo(finalStep);
      }}
    >
      <View pointerEvents={saving || transitioning ? "none" : "auto"}>
        {step === 0 && <GoalStep {...props} />}
        {step === 1 && <ExperienceStep {...props} />}
        {step === 2 && (
          <MeasurementStep
            {...props}
            update={update}
            kind="height"
            weightUnit={weightUnit}
            onUnitChange={setWeightUnit}
          />
        )}
        {step === 3 && (
          <MeasurementStep
            {...props}
            update={update}
            kind="weight"
            weightUnit={weightUnit}
            onUnitChange={setWeightUnit}
          />
        )}
        {step === 4 && <RoutineStep {...props} />}
        {step === 5 && <EquipmentStep {...props} />}
        {step === 6 && <AboutStep {...props} />}
        {step === finalStep && (
          <ReviewStep
            draft={draft}
            weightUnit={weightUnit}
            onEdit={(value) => {
              setEditing(true);
              setStep(value);
            }}
          />
        )}
      </View>
    </StepShell>
  );
}
