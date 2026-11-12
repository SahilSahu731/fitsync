import React, { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import HomeArtwork from "@/assets/tabs/home.svg";
import TrainArtwork from "@/assets/tabs/train.svg";
import LibraryArtwork from "@/assets/tabs/library.svg";
import ProgressArtwork from "@/assets/tabs/progress.svg";
import ProfileArtwork from "@/assets/tabs/profile.svg";

const ARTWORK = {
  home: HomeArtwork,
  train: TrainArtwork,
  library: LibraryArtwork,
  progress: ProgressArtwork,
  profile: ProfileArtwork,
};

// A local vector remains visible while the editable asset or profile photo loads.
const FALLBACK_PATHS = {
  home: "m3.5 10 7-5.8a2.3 2.3 0 0 1 3 0l7 5.8v8.2a2.3 2.3 0 0 1-2.3 2.3H5.8a2.3 2.3 0 0 1-2.3-2.3ZM9 20.5v-6a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5v6",
  train: "M8 12h8M5 7.5h3v9H5zM16 7.5h3v9h-3zM3 10v4M21 10v4",
  library:
    "M12 6.5C9.4 4.8 6.5 4.3 3.3 4.9v12.9c3.2-.7 6.1-.1 8.7 1.7V6.5c2.6-1.7 5.5-2.2 8.7-1.6v12.9c-3.2-.7-6.1-.1-8.7 1.7M6 8.5l3 .5M6 11.5l3 .5",
  progress: "M4 5.5V20h16M6.3 15.6l4.3-4.4 3.3 2.2 4.5-6.2",
  profile:
    "M20.5 12a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0ZM14.6 9.4a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0ZM6.8 18.6c.5-3.5 2.5-5 5.2-5s4.7 1.5 5.2 5",
};

export type TabArtworkName = keyof typeof ARTWORK;
type TabArtworkProps = {
  name: TabArtworkName;
  color: string;
  size?: number;
  avatarUrl?: string | null;
};

export function TabArtwork(props: TabArtworkProps) {
  return (
    <NativeTabArtwork
      key={`${props.name}:${ARTWORK[props.name]}:${props.avatarUrl ?? ""}`}
      {...props}
    />
  );
}

function NativeTabArtwork({ name, color, size = 24, avatarUrl }: TabArtworkProps) {
  const [loaded, setLoaded] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [artworkFailed, setArtworkFailed] = useState(false);
  const showPhoto = Boolean(avatarUrl && !photoFailed);

  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      className="shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {!loaded && (
        <Svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          accessible={false}
        >
          <Path d={FALLBACK_PATHS[name]} />
        </Svg>
      )}
      {(showPhoto || !artworkFailed) && (
        <Image
          source={showPhoto ? { uri: avatarUrl! } : ARTWORK[name]}
          tintColor={showPhoto ? undefined : color}
          contentFit={showPhoto ? "cover" : "contain"}
          cachePolicy="memory-disk"
          transition={0}
          onDisplay={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            if (showPhoto) setPhotoFailed(true);
            else setArtworkFailed(true);
          }}
          accessible={false}
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: showPhoto ? size / 2 : 0,
          }}
        />
      )}
    </View>
  );
}
