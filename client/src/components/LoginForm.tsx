"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi, tokenStorage, userStorage, type User } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface LoginFormProps extends React.ComponentProps<"div"> {
  /** 登录成功回调 */
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
      
      // 保存 Token 和用户信息
      tokenStorage.set(response.access_token);
      userStorage.set(response.user);
      
      setSuccess("登录成功！");
      
      // 回调通知父组件
      if (onLoginSuccess) {
        onLoginSuccess(response.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
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

  // 处理表单提交
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
          {/* 标题 */}
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

          {/* 错误/成功提示 */}
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

          {/* 用户名 */}
          <Field>
            <FieldLabel htmlFor="username">用户名</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />
          </Field>

          {/* 密码 */}
          <Field>
            <FieldLabel htmlFor="password">密码</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder="请输入密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </Field>

          {/* 确认密码（注册模式） */}
          {isRegisterMode && (
            <Field>
              <FieldLabel htmlFor="confirmPassword">确认密码</FieldLabel>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </Field>
          )}

          {/* 提交按钮 */}
          <Field>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRegisterMode ? "注册" : "登录"}
            </Button>
          </Field>

          {/* 切换登录/注册模式 */}
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
