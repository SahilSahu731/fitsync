import React from "react";
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

export type TabArtworkName = keyof typeof ARTWORK;

type TabArtworkProps = {
  name: TabArtworkName;
  color: string;
  selected?: boolean;
  size?: number;
};

export function TabArtwork({ name, color, selected = false, size = 24 }: TabArtworkProps) {
  const Artwork = ARTWORK[name];
  return (
    <Artwork
      width={size}
      height={size}
      color={color}
      fill={selected ? color : "none"}
      strokeWidth={selected ? 1.9 : 1.7}
      accessible={false}
    />
  );
}
