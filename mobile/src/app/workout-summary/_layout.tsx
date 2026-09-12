import { Stack } from "expo-router";

export default function WorkoutSummaryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,

        contentStyle: {
          backgroundColor: "#080808",
        },
      }}
    />
  );
}
