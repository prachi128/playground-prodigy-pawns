import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  UserPlus,
  Layers,
  Wallet,
  Receipt,
  BookOpen,
  ClipboardList,
  Bot,
  ListChecks,
} from "lucide-react";

export type AdminNavSection =
  | "overview"
  | "people"
  | "classes"
  | "billing"
  | "content"
  | "operations"
  | "system";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section: AdminNavSection;
}

export const ADMIN_NAV_SECTION_LABELS: Record<AdminNavSection, string> = {
  overview: "Overview",
  people: "People",
  classes: "Classes",
  billing: "Billing",
  content: "Content",
  operations: "Operations",
  system: "System",
};

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  "overview",
  "people",
  "classes",
  "billing",
  "content",
  "operations",
  "system",
];

export const adminNav: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, section: "overview" },
  { label: "Students", href: "/admin/students", icon: Users, section: "people" },
  { label: "Coaches", href: "/admin/coaches", icon: UserCog, section: "people" },
  { label: "Coach invites", href: "/admin/coach-invites", icon: UserPlus, section: "people" },
  { label: "All classes", href: "/admin/classes", icon: Layers, section: "classes" },
  { label: "Payments", href: "/admin/payments", icon: Wallet, section: "billing" },
  { label: "Fees", href: "/admin/fees", icon: Receipt, section: "billing" },
  { label: "Lessons", href: "/admin/lessons", icon: BookOpen, section: "content" },
  { label: "Assignments", href: "/admin/assignments", icon: ListChecks, section: "operations" },
  { label: "Audit logs", href: "/admin/audit-logs", icon: ClipboardList, section: "system" },
  { label: "Bot calibration", href: "/admin/bot-calibration", icon: Bot, section: "system" },
];
