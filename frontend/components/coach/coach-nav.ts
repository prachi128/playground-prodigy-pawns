import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Puzzle, Users, Layers, BookOpen } from "lucide-react";

export interface CoachNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const coachNav: CoachNavItem[] = [
  { label: "Dashboard", href: "/coach", icon: LayoutDashboard },
  { label: "Students", href: "/coach/students", icon: Users },
  { label: "Batches", href: "/coach/batches", icon: Layers },
  { label: "Assignments", href: "/coach/assignments", icon: BookOpen },
  { label: "Puzzles", href: "/coach/puzzles", icon: Puzzle },
];
