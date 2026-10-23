import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

import {
  catalogApi,
  type Program
} from "@/src/features/training-catalog/api";

import { ProgramCard } from "@/src/features/training-catalog/components/program-card";

export default function AllProgramsScreen() {
  const router = useRouter();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void catalogApi.programs()
      .then(setPrograms)
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
    >
      <Pressable onPress={() => router.back()} className="mb-7">
        <MaterialCommunityIcons
          name="arrow-left"
          size={27}
          color={C.ink}
        />
      </Pressable>

      <Txt weight="semibold" className="text-xs text-brand">
        FITSYNC LIBRARY
      </Txt>

      <Txt weight="extra" className="mb-2 mt-2 text-[34px]">
        ALL PROGRAMS.
      </Txt>

      <Txt className="mb-7 text-sm text-muted">
        Find a structured plan for your training.
      </Txt>

      {loading ? (
        <ActivityIndicator color={C.brand} />
      ) : programs.length === 0 ? (
        <Txt className="text-muted">
          No published programs yet.
        </Txt>
      ) : (
        programs.map(program => (
          <ProgramCard
            key={program.id}
            program={program}
            onPress={() => router.push({
              pathname: "/explore/programs/[id]",
              params: { id: program.id }
            })}
          />
        ))
      )}
    </ScrollView>
  );
}