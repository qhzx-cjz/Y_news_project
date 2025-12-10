"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BottomNav, { type PageType } from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import FeedPage from "@/components/pages/FeedPage";
import EditorPage from "@/components/pages/EditorPage";
import ProfilePage from "@/components/pages/ProfilePage";
import LoginPage from "@/components/pages/LoginPage";
import { tokenStorage, userStorage, type User } from "@/lib/api";
import { Loader2 } from "lucide-react";

// 验证页面类型
const validPages: PageType[] = ["feed", "editor", "search", "profile", "login"];
function isValidPage(page: string | null): page is PageType {
  return page !== null && validPages.includes(page as PageType);
}

// 加载占位组件
function LoadingFallback() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
    </div>
  );
}

// 主页内容组件（使用 useSearchParams）
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");
  const tagParam = searchParams.get("tag"); // 获取标签参数
  const editParam = searchParams.get("edit"); // 获取编辑文章参数
  
  // 解析编辑文章数据
  const editArticle = editParam ? (() => {
    try {
      return JSON.parse(decodeURIComponent(editParam)) as {
        id: number;
        title: string;
        content: string;
      };
    } catch {
      return undefined;
    }
  })() : undefined;
  
  // 初始状态为未登录，确保服务端和客户端一致
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  
  // 客户端挂载后从 localStorage 读取登录状态
  useEffect(() => {
    const initAuth = () => {
      setHasMounted(true);
      const token = tokenStorage.get();
      const savedUser = userStorage.get();
      if (token && savedUser) {
        setIsLoggedIn(true);
        setUser(savedUser);
      }
    };
    initAuth();
  }, []);

  // 从 URL 参数获取当前页面，默认 feed
  const currentPage: PageType = isValidPage(pageParam) ? pageParam : "feed";
  
  // 页面切换处理
  const handlePageChange = (page: PageType) => {
    if (page === "feed") {
      router.push("/");
    } else {
      router.push(`/?page=${page}`);
    }
  };

  // 只有在客户端挂载后才计算头像，避免水合错误
  const userAvatar = hasMounted && user?.avatar 
    ? user.avatar 
    : hasMounted && isLoggedIn 
      ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}` 
      : undefined;

  const handleAvatarClick = () => {
    if (isLoggedIn) {
      handlePageChange("profile");
    } else {
      handlePageChange("login");
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setIsLoggedIn(true);
    setUser(loggedInUser);
    handlePageChange("feed");
  };

  const handleLogout = () => {
    tokenStorage.remove();
    userStorage.remove();
    setIsLoggedIn(false);
    setUser(null);
    handlePageChange("feed");
  };

  const renderPage = () => {
    switch (currentPage) {
      case "feed":
        return <FeedPage />;
      case "editor":
        return <EditorPage initialTag={tagParam || undefined} editArticle={editArticle} />;
      case "profile":
        return <ProfilePage onLogout={handleLogout} user={user} />;
      case "login":
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
      default:
        return <FeedPage />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopNav 
        isLoggedIn={hasMounted && isLoggedIn} 
        avatarUrl={userAvatar}
        onAvatarClick={handleAvatarClick}
      />

      <main className="flex-1 pt-12 pb-14 overflow-hidden">
        {renderPage()}
      </main>

      <BottomNav currentPage={currentPage} onPageChange={handlePageChange} />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <HomeContent />
    </Suspense>
  );
}
