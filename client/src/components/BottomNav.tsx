"use client";

import { cn } from "@/lib/utils";
import { House, PenSquare, User } from "lucide-react";


export type PageType = "feed" | "editor" | "profile";

interface BottomNavProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}


export default function BottomNav({ currentPage, onPageChange }: BottomNavProps) {
  // 导航项配置
  const navItems: { key: PageType; icon: typeof House }[] = [
    { key: "feed",icon: House },
    { key: "editor",icon: PenSquare },
    { key: "profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onPageChange(item.key)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full",
                "transition-colors duration-200",
                "active:bg-accent",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

