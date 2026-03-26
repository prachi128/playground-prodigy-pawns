import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Puzzle, Users, Layers, BookOpen, Trophy, Shield, Presentation, Wallet, UserPlus, UserCog, ClipboardList, Bot } from "lucide-react";

export interface CoachNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** If true, only shown when the user is an admin */
  adminOnly?: boolean;
}

export const coachNav: CoachNavItem[] = [
  { label: "Dashboard", href: "/coach", icon: LayoutDashboard },
  { label: "Students", href: "/coach/students", icon: Users },
  { label: "Leaderboard", href: "/coach/leaderboard", icon: Trophy },
  { label: "Batches", href: "/coach/batches", icon: Layers },
  { label: "Assignments", href: "/coach/assignments", icon: BookOpen },
  { label: "Teaching board", href: "/coach/teaching-board", icon: Presentation },
  { label: "Puzzles", href: "/coach/puzzles", icon: Puzzle },
  { label: "Admin: coach invites", href: "/coach/admin/coach-invites", icon: UserPlus, adminOnly: true },
  { label: "Admin: coaches", href: "/coach/admin/coaches", icon: UserCog, adminOnly: true },
  { label: "Admin: payments", href: "/admin/payments", icon: Wallet, adminOnly: true },
  { label: "Admin: students", href: "/coach/admin/students", icon: Shield, adminOnly: true },
  { label: "Admin: audit logs", href: "/coach/admin/audit-logs", icon: ClipboardList, adminOnly: true },
  { label: "Admin: bot calibration", href: "/coach/admin/bot-calibration", icon: Bot, adminOnly: true },
];
