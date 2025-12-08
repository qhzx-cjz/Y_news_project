"use client";

import { useState, useEffect } from "react";
import BottomNav, { type PageType } from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import FeedPage from "@/components/pages/FeedPage";
import EditorPage from "@/components/pages/EditorPage";
import SearchPage from "@/components/pages/SearchPage";
import ProfilePage from "@/components/pages/ProfilePage";
import LoginPage from "@/components/pages/LoginPage";
import { tokenStorage, userStorage, type User } from "@/lib/api";

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageType>("feed");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // 页面加载时检查登录状态
  useEffect(() => {
    const token = tokenStorage.get();
    const savedUser = userStorage.get();
    
    if (token && savedUser) {
      setIsLoggedIn(true);
      setUser(savedUser);
    }
  }, []);

  // 用户头像
  const userAvatar = user?.avatar || 
    (isLoggedIn ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}` : undefined);

  // 处理顶部导航栏头像点击
  const handleAvatarClick = () => {
    if (isLoggedIn) {
      setCurrentPage("profile");
    } else {
      setCurrentPage("login");
    }
  };

  // 处理登录成功
  const handleLoginSuccess = (loggedInUser: User) => {
    setIsLoggedIn(true);
    setUser(loggedInUser);
    setCurrentPage("feed");
  };

  // 处理退出登录
  const handleLogout = () => {
    tokenStorage.remove();
    userStorage.remove();
    setIsLoggedIn(false);
    setUser(null);
    setCurrentPage("feed");
  };

  // 根据当前页面状态渲染对应的页面组件
  const renderPage = () => {
    switch (currentPage) {
      case "feed":
        return <FeedPage />;
      case "editor":
        return <EditorPage />;
      case "search":
        return <SearchPage />;
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
      {/* 顶部导航栏 */}
      <TopNav 
        isLoggedIn={isLoggedIn} 
        avatarUrl={userAvatar}
        onAvatarClick={handleAvatarClick}
      />

      {/* 主内容区域 */}
      <main className="flex-1 pt-12 pb-14">
        {renderPage()}
      </main>

      {/* 底部导航栏 */}
      <BottomNav currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}
