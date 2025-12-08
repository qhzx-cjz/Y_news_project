import { LogOut, Settings, ChevronRight, User as UserIcon, Bell, Shield, HelpCircle } from "lucide-react";
import type { User } from "@/lib/api";

interface ProfilePageProps {
  /** 当前用户信息 */
  user?: User | null;
  /** 登出回调 */
  onLogout?: () => void;
}

/**
 * 个人中心页面
 * 登录用户点击顶部导航栏头像时显示
 */
export default function ProfilePage({ user, onLogout }: ProfilePageProps) {
  // 使用传入的用户数据，或默认值
  const displayUser = {
    name: user?.username || "用户",
    avatar: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'default'}`,
  };

  const menuItems = [
    { icon: UserIcon, label: "个人资料", onClick: () => {} },
    { icon: Bell, label: "通知设置", onClick: () => {} },
    { icon: Shield, label: "隐私安全", onClick: () => {} },
    { icon: Settings, label: "通用设置", onClick: () => {} },
    { icon: HelpCircle, label: "帮助与反馈", onClick: () => {} },
  ];

  return (
    <div className="flex flex-col min-h-full p-4">
      {/* 用户信息卡片 */}
      <div className="bg-card rounded-xl p-4 mb-4 border border-border">
        <div className="flex items-center gap-4">
          <img
            src={displayUser.avatar}
            alt="用户头像"
            className="w-16 h-16 rounded-full object-cover border-2 border-primary"
          />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{displayUser.name}</h2>
            <p className="text-sm text-muted-foreground">ID: {user?.id || '-'}</p>
          </div>
        </div>
      </div>

      {/* 菜单列表 */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {menuItems.map((item, index) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`
              w-full flex items-center justify-between p-4
              hover:bg-accent transition-colors
              ${index !== menuItems.length - 1 ? "border-b border-border" : ""}
            `}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <span>{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* 退出登录按钮 */}
      <button
        onClick={onLogout}
        className="mt-4 w-full flex items-center justify-center gap-2 p-4 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span>退出登录</span>
      </button>
    </div>
  );
}
