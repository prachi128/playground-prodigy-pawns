import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Puzzle, Users, Layers, BookOpen, Trophy, Shield, Presentation, Wallet, UserPlus, UserCog, ClipboardList, Bot, Swords } from "lucide-react";

export type CoachNavSection = "teaching" | "coach" | "admin";

export interface CoachNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section: CoachNavSection;
  /** If true, only shown when the user is an admin */
  adminOnly?: boolean;
}

export const coachNav: CoachNavItem[] = [
  { label: "Play", href: "/coach/play", icon: Swords, section: "teaching" },
  { label: "Teaching board", href: "/coach/teaching-board", icon: Presentation, section: "teaching" },
  { label: "Dashboard", href: "/coach", icon: LayoutDashboard, section: "coach" },
  { label: "Students", href: "/coach/students", icon: Users, section: "coach" },
  { label: "Leaderboard", href: "/coach/leaderboard", icon: Trophy, section: "coach" },
  { label: "Batches", href: "/coach/batches", icon: Layers, section: "coach" },
  { label: "Assignments", href: "/coach/assignments", icon: BookOpen, section: "coach" },
  { label: "Puzzles", href: "/coach/puzzles", icon: Puzzle, section: "coach" },
  { label: "Admin: coach invites", href: "/coach/admin/coach-invites", icon: UserPlus, section: "admin", adminOnly: true },
  { label: "Admin: coaches", href: "/coach/admin/coaches", icon: UserCog, section: "admin", adminOnly: true },
  { label: "Admin: payments", href: "/admin/payments", icon: Wallet, section: "admin", adminOnly: true },
  { label: "Admin: students", href: "/coach/admin/students", icon: Shield, section: "admin", adminOnly: true },
  { label: "Admin: audit logs", href: "/coach/admin/audit-logs", icon: ClipboardList, section: "admin", adminOnly: true },
  { label: "Admin: bot calibration", href: "/coach/admin/bot-calibration", icon: Bot, section: "admin", adminOnly: true },
];
