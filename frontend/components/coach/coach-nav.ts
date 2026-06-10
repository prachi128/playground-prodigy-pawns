import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Puzzle,
  Users,
  Layers,
  BookOpen,
  Shield,
  Presentation,
  Wallet,
  UserPlus,
  UserCog,
  ClipboardList,
  Bot,
  LineChart,
} from "lucide-react";

export type CoachNavSection = "overview" | "teach" | "manage" | "admin";

export interface CoachNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section: CoachNavSection;
  /** If true, only shown when the user is an admin */
  adminOnly?: boolean;
}

export const COACH_NAV_SECTION_LABELS: Record<Exclude<CoachNavSection, "admin">, string> = {
  overview: "Overview",
  teach: "Teach",
  manage: "Manage",
};

export const coachNav: CoachNavItem[] = [
  { label: "Dashboard", href: "/coach", icon: LayoutDashboard, section: "overview" },
  { label: "My classes", href: "/coach/batches", icon: Layers, section: "overview" },
  { label: "Teaching board", href: "/coach/teaching", icon: Presentation, section: "teach" },
  { label: "Engine", href: "/coach/analysis", icon: LineChart, section: "teach" },
  { label: "Students", href: "/coach/students", icon: Users, section: "manage" },
  { label: "Assignments", href: "/coach/assignments", icon: BookOpen, section: "manage" },
  { label: "Puzzles", href: "/coach/puzzles", icon: Puzzle, section: "manage" },
  { label: "Admin: coach invites", href: "/coach/admin/coach-invites", icon: UserPlus, section: "admin", adminOnly: true },
  { label: "Admin: coaches", href: "/coach/admin/coaches", icon: UserCog, section: "admin", adminOnly: true },
  { label: "Admin: payments", href: "/admin/payments", icon: Wallet, section: "admin", adminOnly: true },
  { label: "Admin: students", href: "/coach/admin/students", icon: Shield, section: "admin", adminOnly: true },
  { label: "Admin: audit logs", href: "/coach/admin/audit-logs", icon: ClipboardList, section: "admin", adminOnly: true },
  { label: "Admin: bot calibration", href: "/coach/admin/bot-calibration", icon: Bot, section: "admin", adminOnly: true },
];
