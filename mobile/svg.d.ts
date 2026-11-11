declare module "*.svg" {
  import type { FC } from "react";
  import type { SvgProps } from "react-native-svg";

  const artwork: FC<SvgProps>;
  export default artwork;
}
