import {
  Ionicons,
} from "@expo/vector-icons";

import {
  Tabs,
} from "expo-router";


export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:
          false,

        tabBarActiveTintColor:
          "#3B82F6",

        tabBarInactiveTintColor:
          "#737373",

        tabBarHideOnKeyboard:
          true,

        tabBarStyle: {
          height:
            72,

          paddingTop:
            8,

          paddingBottom:
            8,

          backgroundColor:
            "#080808",

          borderTopColor:
            "#202020",

          borderTopWidth:
            1,
        },

        tabBarLabelStyle: {
          fontSize:
            11,

          fontWeight:
            "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:
            "Home",

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "home"
                  : "home-outline"
              }
              size={
                size
              }
              color={
                color
              }
            />
          ),
        }}
      />

      <Tabs.Screen
        name="train"
        options={{
          title:
            "Train",

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "barbell"
                  : "barbell-outline"
              }
              size={
                size
              }
              color={
                color
              }
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title:
            "You",

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? "person"
                  : "person-outline"
              }
              size={
                size
              }
              color={
                color
              }
            />
          ),
        }}
      />
    </Tabs>
  );
}