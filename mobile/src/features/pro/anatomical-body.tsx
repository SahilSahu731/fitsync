import React from "react";
import Svg, { G, Image as SvgImage, Path } from "react-native-svg";

type AnatomicalView = "front" | "back";

export const MUSCLE_VIEWS: Readonly<Record<string, readonly AnatomicalView[]>> = {
  chest: ["front"],
  lats: ["back"],
  "upper-back": ["back"],
  "lower-back": ["back"],
  "front-delts": ["front"],
  "side-delts": ["front"],
  "rear-delts": ["back"],
  biceps: ["front"],
  triceps: ["back"],
  forearms: ["front", "back"],
  abs: ["front"],
  obliques: ["front"],
  glutes: ["back"],
  quads: ["front"],
  hamstrings: ["back"],
  calves: ["front", "back"],
  "hip-flexors": ["front"],
  traps: ["back"],
  adductors: ["front"],
  abductors: ["front"],
};

// These contours follow the original atlas at 1000 × 1000. The second side is
// mirrored around each figure's centre, keeping the illustration and hit areas aligned.
const REGIONS: { code: string; view: AnatomicalView; d: string }[] = [
  {
    code: "chest",
    view: "front",
    d: "M176 185 C195 177 231 180 255 190 C259 205 261 233 254 252 C246 274 214 282 191 268 C176 260 166 248 163 232 C165 214 168 195 176 185Z",
  },
  {
    code: "front-delts",
    view: "front",
    d: "M164 184 C148 189 135 209 134 231 C134 247 141 262 150 273 C160 259 169 239 173 217 C178 198 174 188 164 184Z",
  },
  {
    code: "side-delts",
    view: "front",
    d: "M156 184 C132 188 118 211 115 237 C112 252 116 268 125 278 L138 255 C130 231 138 201 156 184Z",
  },
  {
    code: "biceps",
    view: "front",
    d: "M139 263 C123 273 116 294 115 313 C113 329 116 343 123 349 C138 344 151 322 157 300 C161 285 157 272 151 263 L144 276Z",
  },
  {
    code: "forearms",
    view: "front",
    d: "M112 340 C100 351 89 380 85 408 L77 471 L95 480 C98 452 113 427 126 400 C136 378 136 359 127 345 L120 365Z",
  },
  {
    code: "abs",
    view: "front",
    d: "M227 275 C236 278 248 275 258 267 L259 437 C250 462 244 472 239 474 C241 444 230 421 223 405 L222 375 C219 352 218 326 222 301Z",
  },
  {
    code: "obliques",
    view: "front",
    d: "M180 275 C189 283 201 285 216 283 L211 327 C207 354 217 386 226 408 C206 404 189 398 180 383 C174 353 173 312 180 275Z",
  },
  {
    code: "hip-flexors",
    view: "front",
    d: "M181 405 C194 409 214 421 229 439 L244 476 L234 491 C217 468 205 447 187 431 L178 420Z",
  },
  {
    code: "quads",
    view: "front",
    d: "M176 429 C179 457 192 480 205 509 C223 548 234 589 223 625 C218 641 207 649 197 646 C185 634 186 620 183 604 C167 590 158 565 156 536 C154 502 162 456 176 429Z",
  },
  {
    code: "adductors",
    view: "front",
    d: "M230 470 C236 479 244 484 252 484 C252 515 244 554 234 585 L225 604 C227 568 211 533 209 508 C210 492 218 481 230 470Z",
  },
  {
    code: "abductors",
    view: "front",
    d: "M172 416 C163 434 154 464 153 488 L159 520 C162 486 176 459 180 441 L181 421Z",
  },
  {
    code: "calves",
    view: "front",
    d: "M184 685 C194 696 204 702 215 701 C226 729 223 764 213 791 C206 807 199 816 192 837 C193 803 190 766 184 741 C180 720 179 700 184 685Z",
  },
  {
    code: "traps",
    view: "back",
    d: "M729 130 C716 149 690 168 674 179 C693 183 710 189 724 201 L739 251 L739 145Z",
  },
  {
    code: "upper-back",
    view: "back",
    d: "M684 207 C698 215 711 216 725 211 L737 257 L737 326 C718 316 705 297 694 275 L674 244Z",
  },
  {
    code: "lats",
    view: "back",
    d: "M650 253 C664 269 679 271 691 261 C704 292 714 321 733 337 L721 393 L709 417 C687 391 669 368 658 337 C650 312 646 282 650 253Z",
  },
  {
    code: "lower-back",
    view: "back",
    d: "M735 331 L739 343 L739 427 L728 441 L716 418 C716 391 725 365 735 331Z",
  },
  {
    code: "rear-delts",
    view: "back",
    d: "M666 184 C646 182 620 193 608 212 C597 231 591 249 592 264 C609 256 627 239 642 224 C653 214 663 201 666 184Z",
  },
  {
    code: "triceps",
    view: "back",
    d: "M610 255 C597 261 588 280 585 301 C582 318 585 338 592 349 C609 343 626 324 635 302 C640 289 639 275 633 264 C626 264 618 260 610 255Z",
  },
  {
    code: "forearms",
    view: "back",
    d: "M583 344 C569 361 554 389 548 414 L541 469 L562 478 C565 451 580 430 593 407 C603 389 606 368 597 351 L590 367Z",
  },
  {
    code: "glutes",
    view: "back",
    d: "M662 418 C683 402 714 413 737 440 L738 479 C731 507 701 523 672 522 C652 518 641 506 643 487 C644 462 649 436 662 418Z",
  },
  {
    code: "hamstrings",
    view: "back",
    d: "M650 527 C673 530 700 522 724 504 C728 547 720 588 709 625 L698 678 C689 671 683 658 676 649 C659 628 650 602 646 576 C643 559 644 540 650 527Z",
  },
  {
    code: "calves",
    view: "back",
    d: "M672 689 C681 688 691 693 698 703 C707 720 706 745 701 770 C698 793 689 807 682 825 C680 849 679 881 671 909 C666 880 665 852 662 831 C648 812 635 789 634 763 C631 737 640 707 654 692Z",
  },
];

const atlas = require("../../../assets/anatomy/muscle-atlas.png");

export function AnatomicalBody({
  muscles,
  back = false,
  size = 150,
  small = false,
  selected,
  intensity,
  onSelect,
}: {
  muscles: string[];
  back?: boolean;
  size?: number;
  small?: boolean;
  selected?: string;
  intensity?: Record<string, number>;
  onSelect?: (muscle: string) => void;
}) {
  const width = small ? 38 : Number.isFinite(size) && size > 0 ? size : 150;
  const view = back ? "back" : "front";
  const mirrorX = back ? 1484 : 526;
  return (
    <Svg
      width={width}
      height={width * 2}
      viewBox={back ? "500 0 500 1000" : "0 0 500 1000"}
      style={{ overflow: "hidden" }}
      accessibilityLabel={`${back ? "Back" : "Front"} anatomical muscle map`}
      accessible={!onSelect}
    >
      <SvgImage
        href={atlas}
        width={1000}
        height={1000}
        preserveAspectRatio="xMidYMid meet"
        accessible={false}
      />
      {REGIONS.filter((region) => region.view === view).map((region) => {
        const active = muscles.includes(region.code);
        const raw = intensity ? (intensity[region.code] ?? 0) : 1;
        const level = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
        const isSelected = selected === region.code;
        return (
          <G
            key={region.code}
            testID={`anatomy-${view}-${region.code}`}
            accessible={!!onSelect}
            accessibilityLabel={`${region.code.replaceAll("-", " ")} muscle${isSelected ? ", selected" : ""}`}
            disabled={!onSelect}
            onPress={onSelect ? () => onSelect(region.code) : undefined}
            fill="#159CFF"
            fillOpacity={active ? 0.18 + level * 0.4 : 0}
            stroke={isSelected ? "#ECF7FF" : "none"}
            strokeWidth={isSelected ? 3 : 0}
            strokeLinejoin="round"
          >
            <Path d={region.d} />
            <Path d={region.d} transform={`translate(${mirrorX} 0) scale(-1 1)`} />
          </G>
        );
      })}
    </Svg>
  );
}
