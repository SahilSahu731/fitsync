import {
  Stack,
} from "expo-router";


export default function WorkoutsLayout() {
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