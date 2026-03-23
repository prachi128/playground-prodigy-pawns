"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CoachHeader } from "./coach-header";
import { CoachSidebar } from "./coach-sidebar";

const TEACHING_BOARD_PATH = "/coach/teaching-board";
/** Pixels from top of viewport that reveal the header (desktop teaching board) */
const REVEAL_EDGE_PX = 36;
const HIDE_DELAY_MS = 550;

interface CoachLayoutProps {
  children: React.ReactNode;
}

export function CoachLayout({ children }: CoachLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isTeachingBoard = pathname === TEACHING_BOARD_PATH;

  const [isLg, setIsLg] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const autoHideHeader = isTeachingBoard && isLg;
  const [headerRevealed, setHeaderRevealed] = useState(() => !isTeachingBoard);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerElRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!autoHideHeader) {
      setHeaderRevealed(true);
      return;
    }
    setHeaderRevealed(false);
  }, [autoHideHeader, pathname]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!autoHideHeader) return;

    function pointerInHeaderRegion(clientX: number, clientY: number): boolean {
      if (clientY >= 0 && clientY <= REVEAL_EDGE_PX) return true;
      const el = headerElRef.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        clientX >= r.left &&
        clientX <= r.right &&
        clientY >= r.top &&
        clientY <= r.bottom
      );
    }

    function onMove(e: MouseEvent) {
      if (pointerInHeaderRegion(e.clientX, e.clientY)) {
        clearHideTimer();
        setHeaderRevealed(true);
        return;
      }
      if (!hideTimerRef.current) {
        hideTimerRef.current = setTimeout(() => {
          setHeaderRevealed(false);
          hideTimerRef.current = null;
        }, HIDE_DELAY_MS);
      }
    }

    document.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMove);
      clearHideTimer();
    };
  }, [autoHideHeader, clearHideTimer]);

  return (
    <div data-coach-shell className="relative min-h-screen bg-background">
      <CoachSidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Offset for fixed sidebar on lg+; main column scrolls independently */}
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <div
          ref={headerElRef}
          className={
            autoHideHeader
              ? `coach-header-autohide fixed left-0 right-0 top-0 z-30 shrink-0 transition-transform duration-200 ease-out lg:left-64 ${
                  headerRevealed ? "translate-y-0" : "-translate-y-full pointer-events-none"
                } [&_header]:static`
              : "shrink-0"
          }
        >
          <CoachHeader onMenuClick={() => setMobileSidebarOpen(true)} />
        </div>

        <div
          className={`coach-main min-h-0 flex-1 overflow-y-auto ${
            autoHideHeader ? (headerRevealed ? "pt-14" : "pt-0") : ""
          } transition-[padding] duration-200 ease-out`}
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
