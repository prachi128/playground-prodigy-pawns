import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Puzzle,
  Users,
  Layers,
  BookOpen,
  Presentation,
  LineChart,
  Trophy,
  ListChecks,
} from "lucide-react";

export type CoachNavSection = "overview" | "teach" | "manage";

export interface CoachNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section: CoachNavSection;
}

export const COACH_NAV_SECTION_LABELS: Record<CoachNavSection, string> = {
  overview: "Overview",
  teach: "Teach",
  manage: "Manage",
};

export const COACH_NAV_SECTIONS: CoachNavSection[] = ["overview", "teach", "manage"];

export const coachNav: CoachNavItem[] = [
  { label: "Dashboard", href: "/coach", icon: LayoutDashboard, section: "overview" },
  { label: "My classes", href: "/coach/batches", icon: Layers, section: "overview" },
  { label: "Teaching board", href: "/coach/teaching", icon: Presentation, section: "teach" },
  { label: "Engine", href: "/coach/analysis", icon: LineChart, section: "teach" },
  { label: "Students", href: "/coach/students", icon: Users, section: "manage" },
  { label: "Assignments", href: "/coach/assignments", icon: ListChecks, section: "manage" },
  { label: "Lessons", href: "/coach/lessons", icon: BookOpen, section: "manage" },
  { label: "Puzzles", href: "/coach/puzzles", icon: Puzzle, section: "manage" },
  { label: "Rankings", href: "/coach/leaderboard", icon: Trophy, section: "manage" },
];
