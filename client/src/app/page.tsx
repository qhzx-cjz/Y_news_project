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

  const userAvatar = user?.avatar || 
    (isLoggedIn ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}` : undefined);

  const handleAvatarClick = () => {
    if (isLoggedIn) {
      setCurrentPage("profile");
    } else {
      setCurrentPage("login");
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setIsLoggedIn(true);
    setUser(loggedInUser);
    setCurrentPage("feed");
  };

  const handleLogout = () => {
    tokenStorage.remove();
    userStorage.remove();
    setIsLoggedIn(false);
    setUser(null);
    setCurrentPage("feed");
  };

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
      <TopNav 
        isLoggedIn={isLoggedIn} 
        avatarUrl={userAvatar}
        onAvatarClick={handleAvatarClick}
      />

      <main className="flex-1 pt-12 pb-14 overflow-hidden">
        {renderPage()}
      </main>

      <BottomNav currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}
