"use client";

import { CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopNavProps {
  /** 是否已登录 */
  isLoggedIn: boolean;
  /** 用户头像 URL */
  avatarUrl?: string;
  /** 点击头像/登录图标的回调 */
  onAvatarClick: () => void;
}

export default function TopNav({ isLoggedIn, avatarUrl, onAvatarClick }: TopNavProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-12 px-4 max-w-md mx-auto">
        {/* 左侧 Logo */}
        <div className="flex items-center">
          <span className="text-lg font-bold text-primary">Y</span>
        </div>

        {/* 右侧用户头像/登录按钮 */}
        <button
          onClick={onAvatarClick}
          className={cn(
            "flex items-center justify-center",
            "w-8 h-8 rounded-full",
            "transition-all duration-200",
            "hover:opacity-80 active:scale-95"
          )}
        >
          {isLoggedIn && avatarUrl ? (
            <img
              src={avatarUrl}
              alt="用户头像"
              className="w-8 h-8 rounded-full object-cover border border-border"
            />
          ) : (
            <CircleUserRound className="w-7 h-7 text-muted-foreground hover:text-foreground transition-colors" />
          )}
        </button>
      </div>
    </header>
  );
}

