import { LoginForm } from "../LoginForm";
import type { User } from "@/lib/api";

interface LoginPageProps {
  /** 登录成功回调 */
  onLoginSuccess?: (user: User) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-1 items-center justify-center mt-8">
          <div className="w-full max-w-xs">
            <LoginForm onLoginSuccess={onLoginSuccess} />
          </div>
        </div>
      </div>
    </div>
  );
}
