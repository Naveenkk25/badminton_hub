"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { PageTransition } from "@/components/layout/PageTransition";
import { NAV_ITEMS } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-court-blue" />
      </div>
    );
  }

  // Find current page title
  const currentNavItem = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const title = currentNavItem?.label || "Dashboard";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        isMobile={isMobile} 
        isOpenMobile={isMobileSidebarOpen} 
        setIsOpenMobile={setIsMobileSidebarOpen}
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
      />
      <div 
        className="flex flex-1 flex-col transition-all duration-300 ease-in-out w-full"
        style={{ paddingLeft: isMobile ? 0 : (isSidebarExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED) }}
      >
        <TopBar 
          title={title} 
          onMenuClick={() => setIsMobileSidebarOpen(true)} 
        />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
