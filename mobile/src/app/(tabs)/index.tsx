
import React from "react";
import {
  Pressable,
  ScrollView,
  View
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import {
  Card,
  SectionHeading,
  Txt
} from "@/src/components/ui";

import { useSession } from "@/src/context/session";

const week = ["M", "T", "W", "T", "F", "S", "S"];

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useSession();

  const firstName =
    user?.name.split(" ")[0].toUpperCase() || "ATHLETE";

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        paddingHorizontal: 22,
        paddingTop: 24,
        paddingBottom: 50
      }}
    >
      {/* Greeting */}

      <View className="mb-8 flex-row items-center justify-between">
        <View className="flex-1">
          <Txt className="text-xs tracking-[2px] text-muted">
            MAKE TODAY COUNT
          </Txt>

          <Txt
            weight="extra"
            className="mt-1 text-[30px] tracking-tight"
          >
            HEY, {firstName} ✌
          </Txt>
        </View>

        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          className="h-12 w-12 items-center justify-center rounded-full border border-border bg-panel"
        >
          <MaterialCommunityIcons
            name="account-circle-outline"
            size={29}
            color={C.ink}
          />
        </Pressable>
      </View>

      {/* Featured workout */}

      <View className="overflow-hidden rounded-[30px] bg-brand p-6">
        <View className="flex-row items-center justify-between">
          <View className="rounded-full bg-[#151515] px-3 py-1">
            <Txt
              weight="extra"
              className="text-[10px] tracking-[2px]"
            >
              YOUR NEXT SESSION
            </Txt>
          </View>

          <Txt weight="extra" className="text-xs text-bg">
            01 / 03
          </Txt>
        </View>

        <View className="mt-9 flex-row items-center">
          <Txt
            weight="extra"
            className="flex-1 text-[43px] leading-[43px] tracking-tight text-bg"
          >
            UPPER{"\n"}BODY.
          </Txt>

          <MaterialCommunityIcons
            name="weight-lifter"
            color={C.bg}
            size={78}
          />
        </View>

        <Txt weight="medium" className="mt-3 text-sm text-bg">
          Chest · Back · Shoulders
        </Txt>

        <View className="mt-6 flex-row gap-4">
          <Txt weight="semibold" className="text-xs text-bg">
            ◷ 45 MIN
          </Txt>

          <Txt weight="semibold" className="text-xs text-bg">
            ◈ 6 EXERCISES
          </Txt>
        </View>

        <Pressable
          onPress={() => router.push("/workout?plan=upper")}
          className="mt-7 flex-row items-center justify-between rounded-2xl bg-bg px-5 py-4"
        >
          <Txt weight="bold" className="text-base">
            START WORKOUT
          </Txt>

          <MaterialCommunityIcons
            name="arrow-top-right"
            size={24}
            color={C.ink}
          />
        </Pressable>
      </View>

      {/* Weekly activity */}

      <View className="mt-7">
        <SectionHeading
          title="Your week"
          action="VIEW PROGRESS"
          onAction={() => router.push("/(tabs)/progress")}
        />

        <View className="flex-row justify-between">
          {week.map((label, i) => {
            const active = [0, 2, 4].includes(i);

            return (
              <View key={i} className="items-center">
                <Txt weight="medium" className="text-xs text-muted">
                  {label}
                </Txt>

                <View
                  className={`mt-2 h-10 w-10 items-center justify-center rounded-full ${active ? "bg-brand" : "border border-border bg-panel"}`}
                >
                  <MaterialCommunityIcons
                    name={active ? "check" : "minus"}
                    color={active ? C.bg : C.muted}
                    size={17}
                  />
                </View>
              </View>
            );
          })}
        </View>

        <Txt className="mt-3 text-xs text-muted">
          Example activity only. Real sessions will replace these.
        </Txt>
      </View>

      {/* Stats */}

      <View className="mt-8">
        <SectionHeading title="At a glance" />

        <View className="flex-row gap-3">
          <Card className="flex-1">
            <MaterialCommunityIcons
              name="calendar-check"
              color={C.brand}
              size={23}
            />

            <Txt weight="extra" className="mt-4 text-3xl">
              3 / {profile?.trainingDays || 4}
            </Txt>

            <Txt className="text-xs text-muted">
              Sessions this week
            </Txt>
          </Card>

          <Card className="flex-1">
            <MaterialCommunityIcons
              name="trending-up"
              color={C.brand}
              size={23}
            />

            <Txt weight="extra" className="mt-4 text-3xl">
              +12%
            </Txt>

            <Txt className="text-xs text-muted">
              Example improvement
            </Txt>
          </Card>
        </View>
      </View>

      {/* Shortcuts */}

      <View className="mt-8">
        <SectionHeading title="Quick access" />

        <Pressable
          onPress={() => router.push("/(tabs)/library")}
          className="mb-3 flex-row items-center rounded-2xl border border-border bg-panel p-4"
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-elevated">
            <MaterialCommunityIcons
              name="bookshelf"
              color={C.brand}
              size={24}
            />
          </View>

          <View className="flex-1">
            <Txt weight="bold" className="text-base">
              Exercise library
            </Txt>

            <Txt className="text-xs text-muted">
              Browse techniques and equipment
            </Txt>
          </View>

          <MaterialCommunityIcons
            name="chevron-right"
            color={C.muted}
            size={24}
          />
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/train")}
          className="flex-row items-center rounded-2xl border border-border bg-panel p-4"
        >
          <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-elevated">
            <MaterialCommunityIcons
              name="dumbbell"
              color={C.brand}
              size={24}
            />
          </View>

          <View className="flex-1">
            <Txt weight="bold" className="text-base">
              Browse workouts
            </Txt>

            <Txt className="text-xs text-muted">
              Pick a session that suits you
            </Txt>
          </View>

          <MaterialCommunityIcons
            name="chevron-right"
            color={C.muted}
            size={24}
          />
        </Pressable>
      </View>
    </ScrollView>
  );
}
