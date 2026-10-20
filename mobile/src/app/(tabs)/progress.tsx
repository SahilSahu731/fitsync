
import React from "react";
import {
  ScrollView,
  View
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Card, Txt } from "@/src/components/ui";

const bars = [42, 66, 38, 76, 53, 95, 63];
const days = ["M", "T", "W", "T", "F", "S", "S"];

export default function ProgressScreen() {
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        padding: 23,
        paddingBottom: 55
      }}
    >
      <Txt
        weight="medium"
        className="text-xs tracking-[2px] text-brand"
      >
        TRACK THE WORK
      </Txt>

      <Txt weight="extra" className="mt-1 text-[38px]">
        GET BETTER.
      </Txt>

      <Txt className="mb-7 mt-2 text-sm text-muted">
        Consistency adds up. Here&apos;s what your progress
        dashboard will look like.
      </Txt>

      {/* Statistics */}

      <View className="mb-3 flex-row gap-3">
        <Card className="flex-1">
          <MaterialCommunityIcons
            name="calendar-check"
            color={C.brand}
            size={24}
          />

          <Txt weight="extra" className="mt-4 text-4xl">
            12
          </Txt>

          <Txt className="mt-1 text-xs text-muted">
            Workouts logged
          </Txt>
        </Card>

        <Card className="flex-1">
          <MaterialCommunityIcons
            name="trophy-outline"
            color={C.brand}
            size={24}
          />

          <Txt weight="extra" className="mt-4 text-4xl">
            04
          </Txt>

          <Txt className="mt-1 text-xs text-muted">
            Personal records
          </Txt>
        </Card>
      </View>

      {/* Chart */}

      <Card className="mt-2">
        <View className="flex-row items-center justify-between">
          <Txt weight="bold" className="text-lg">
            Weekly activity
          </Txt>

          <Txt weight="bold" className="text-xs text-brand">
            THIS WEEK
          </Txt>
        </View>

        <View
          className="mt-6 flex-row items-end justify-between"
          style={{ height: 142 }}
        >
          {bars.map((height, index) => (
            <View key={index} className="items-center">
              <View
                style={{
                  height: height * 1.25,
                  width: 24,
                  backgroundColor:
                    index === 5 ? C.brand : "#3A3633",
                  borderRadius: 8
                }}
              />

              <Txt className="mt-3 text-[11px] text-muted">
                {days[index]}
              </Txt>
            </View>
          ))}
        </View>
      </Card>

      {/* Personal bests */}

      <View className="mt-7">
        <Txt weight="extra" className="mb-4 text-[21px]">
          PERSONAL BESTS
        </Txt>

        {[
          ["Bench Press", "60 kg × 8"],
          ["Back Squat", "80 kg × 5"],
          ["Lat Pulldown", "45 kg × 12"]
        ].map(([name, record]) => (
          <View
            key={name}
            className="mb-2.5 flex-row items-center rounded-2xl border border-border bg-panel p-4"
          >
            <View className="mr-4 h-11 w-11 items-center justify-center rounded-xl bg-elevated">
              <MaterialCommunityIcons
                name="trophy"
                color={C.brand}
                size={22}
              />
            </View>

            <View className="flex-1">
              <Txt weight="bold">{name}</Txt>

              <Txt className="text-xs text-muted">
                Example record
              </Txt>
            </View>

            <Txt
              weight="extra"
              className="text-sm text-brand"
            >
              {record}
            </Txt>
          </View>
        ))}
      </View>

      <View className="mt-5 rounded-2xl border border-brand bg-[#271F1B] p-5">
        <Txt weight="extra" className="text-sm text-brand">
          DEMO DASHBOARD
        </Txt>

        <Txt className="mt-2 text-sm leading-6 text-muted">
          Every number on this screen is placeholder data.
          Real charts and personal records will use workout
          history in a later phase.
        </Txt>
      </View>
    </ScrollView>
  );
}
