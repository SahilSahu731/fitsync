import { Linking, View } from "react-native";
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { useAppAlert } from "@/src/components/app-dialog";
import { legalUrls } from "@/src/lib/legal";

export function LegalLinks() {
  const Alert = useAppAlert();
  return (
    <View className="flex-row flex-wrap justify-center gap-x-6">
      {[
        { label: "Privacy Policy", url: legalUrls.privacy },
        { label: "Terms of Service", url: legalUrls.terms },
      ].map(
        ({ label, url }) =>
          url && (
            <MotionPressable
              key={label}
              accessibilityRole="link"
              accessibilityLabel={label}
              className="min-h-12 justify-center py-3"
              onPress={() => {
                void Linking.openURL(url).catch(() =>
                  Alert.alert("Could not open page", "Check your connection and try again."),
                );
              }}
            >
              <Txt className="text-sm text-muted underline">{label}</Txt>
            </MotionPressable>
          ),
      )}
    </View>
  );
}
