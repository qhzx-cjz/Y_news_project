import { LogOut, User as UserIcon} from "lucide-react";
import type { User } from "@/lib/api";

interface ProfilePageProps {
  user?: User | null;
  onLogout?: () => void;
}


export default function ProfilePage({ user, onLogout }: ProfilePageProps) {
  const displayUser = {
    name: user?.username || "用户",
    avatar: user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'default'}`,
  };


  return (
    <div className="flex flex-col min-h-full p-4">
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
