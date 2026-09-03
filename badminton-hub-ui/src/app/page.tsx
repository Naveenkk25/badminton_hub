"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="text-4xl animate-bounce">🏸</div>
        <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-court-blue w-1/2 rounded-full shimmer"></div>
        </div>
      </div>
    </div>
  );
}
