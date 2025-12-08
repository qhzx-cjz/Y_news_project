"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { WaveInput } from "@/components/ui/wave-input";
import { authApi, tokenStorage, userStorage, type User } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface LoginFormProps extends React.ComponentProps<"div"> {
  onLoginSuccess?: (user: User) => void;
}

export function LoginForm({ className, onLoginSuccess, ...props }: LoginFormProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      setError("请填写用户名和密码");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await authApi.login(username, password);
      
      tokenStorage.set(response.access_token);
      userStorage.set(response.user);
      
      setSuccess("登录成功！");
      
      if (onLoginSuccess) {
        onLoginSuccess(response.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password) {
      setError("请填写用户名和密码");
      return;
    }

    if (password.length < 6) {
      setError("密码长度不能少于6位");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authApi.register(username, password);
      setSuccess("注册成功！请登录");
      setIsRegisterMode(false);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegisterMode) {
      handleRegister();
    } else {
      handleLogin();
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center mb-4">
            <h1 className="text-2xl font-bold">
              {isRegisterMode ? "创建账户" : "登录账户"}
            </h1>
            <p className="text-muted-foreground text-sm text-balance">
              {isRegisterMode
                ? "填写以下信息注册新账户"
                : "输入用户名和密码登录"}
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg">
              {success}
            </div>
          )}

          <WaveInput
            label="用户名"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
          />

          <WaveInput
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          {isRegisterMode && (
            <WaveInput
              label="确认密码"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          )}

          <Button type="submit" className="w-full mt-6" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRegisterMode ? "注册" : "登录"}
          </Button>

          <div className="text-center text-sm">
            {isRegisterMode ? (
              <>
                已有账户？{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError("");
                    setSuccess("");
                  }}
                  className="underline underline-offset-4 hover:text-primary"
                >
                  去登录
                </button>
              </>
            ) : (
              <>
                还没有账户？{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(true);
                    setError("");
                    setSuccess("");
                  }}
                  className="underline underline-offset-4 hover:text-primary"
                >
                  去注册
                </button>
              </>
            )}
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
