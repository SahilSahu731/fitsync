import {
  ArrowLeft, ArrowRight, BookOpen, ChartNoAxesCombined, Check, Clock3,
  Dumbbell, Image, LayoutGrid, LogOut, Menu, Pencil, Play, Plus,
  Settings2, ShieldCheck, SlidersHorizontal, Search, Trash2, Upload,
  UserRound, UsersRound, X, type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  dumbbell: Dumbbell, arrow: ArrowRight, search: Search, plus: Plus, close: X,
  menu: Menu, grid: LayoutGrid, user: UserRound, settings: Settings2,
  logout: LogOut, shield: ShieldCheck, chart: ChartNoAxesCombined,
  people: UsersRound, filter: SlidersHorizontal, check: Check, upload: Upload,
  image: Image, play: Play, edit: Pencil, trash: Trash2, back: ArrowLeft,
  clock: Clock3, book: BookOpen,
};

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const Component = icons[name] ?? Dumbbell;
  return <Component size={size} strokeWidth={1.8} aria-hidden="true" className={className} />;
}
