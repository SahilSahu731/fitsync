import {
  Stack,
} from "expo-router";


export default function WorkoutHistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown:
          false,

        contentStyle: {
          backgroundColor:
            "#080808",
        },
      }}
    />
  );
}