import {
  Stack,
} from "expo-router";


export default function ProfileLayout() {
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
    >
      <Stack.Screen
        name="index"
      />

      <Stack.Screen
        name="edit"
        options={{
          animation:
            "slide_from_right",
        }}
      />

      <Stack.Screen
        name="preferences"
        options={{
          animation:
            "slide_from_right",
        }}
      />

      <Stack.Screen
        name="account"
        options={{
          animation:
            "slide_from_right",
        }}
      />
    </Stack>
  );
}