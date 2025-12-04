"use client";

import { useState } from "react";
import BottomNav, { type PageType } from "@/components/BottomNav";
import FeedPage from "@/components/pages/FeedPage";
import EditorPage from "@/components/pages/EditorPage";
import ProfilePage from "@/components/pages/ProfilePage";

/**
 * 主页面组件
 * 管理页面状态并根据底部导航栏的选择渲染对应的页面内容
 */
export default function Home() {
  // 当前显示的页面，默认为资讯浏览页面
  const [currentPage, setCurrentPage] = useState<PageType>("feed");

  const renderPage = () => {
    switch (currentPage) {
      case "feed":
        return <FeedPage />;
      case "editor":
        return <EditorPage />;
      case "profile":
        return <ProfilePage />;
      default:
        return <FeedPage />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-14">
        {renderPage()}
      </main>

      {/* 底部导航栏 */}
      <BottomNav currentPage={currentPage} onPageChange={setCurrentPage} />
    </div>
  );
}
