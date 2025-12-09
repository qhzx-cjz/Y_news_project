"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { articleApi, type Article } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Heart, Eye, Loader2, RefreshCw } from "lucide-react";

// 每页加载数量
const PAGE_SIZE = 10;

// 从 HTML 内容中提取第一张图片
function extractFirstImage(html: string): string | null {
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/);
  return imgMatch ? imgMatch[1] : null;
}

// 从 HTML 内容中提取纯文本（去除标签）
function extractTextContent(html: string): string {
  // 移除图片标签
  const withoutImages = html.replace(/<img[^>]*>/g, "");
  // 移除所有 HTML 标签
  const text = withoutImages.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text;
}

// 格式化时间显示
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  return date.toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

// 格式化数字显示
function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

// 单条 Feed 卡片组件
interface FeedCardProps {
  article: Article;
  onLike: (id: number) => void;
  onClick: (id: number) => void;
}

function FeedCard({ article, onLike, onClick }: FeedCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState(article.likes);
  const [hasLiked, setHasLiked] = useState(false);

  const textContent = extractTextContent(article.content);
  const imageUrl = extractFirstImage(article.content);
  const authorAvatar =
    article.author?.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${article.author?.username || "user"}`;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking || hasLiked) return;

    setIsLiking(true);
    try {
      const result = await articleApi.like(article.id);
      setLocalLikes(result.likes);
      setHasLiked(true);
      onLike(article.id);
    } catch {
      // 忽略错误
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <article
      className="px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => onClick(article.id)}
    >
      {/* 头部：头像 + 用户名 + 时间 */}
      <div className="flex items-start gap-3">
        {/* 头像 */}
        <img
          src={authorAvatar}
          alt={article.author?.username || "用户"}
          className="w-10 h-10 rounded-full bg-muted flex-shrink-0"
        />

        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          {/* 用户名 + @handle + 时间 */}
          <div className="flex items-center gap-1 text-sm">
            <span className="font-semibold truncate">
              {article.author?.username || "匿名用户"}
            </span>
            <span className="text-muted-foreground truncate">
              @{article.author?.username || "anonymous"}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground whitespace-nowrap">
              {formatTime(article.createdAt)}
            </span>
          </div>

          {/* 标题（如果有） */}
          {article.title && (
            <h3 className="font-medium mt-1 line-clamp-1">{article.title}</h3>
          )}

          {/* 正文内容 */}
          {textContent && (
            <p className="text-sm mt-1 text-foreground/90 line-clamp-3 whitespace-pre-wrap">
              {textContent}
            </p>
          )}

          {/* 图片预览 */}
          {imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border">
              <img
                src={imageUrl}
                alt="文章图片"
                className="w-full max-h-80 object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* 底部操作栏 */}
          <div className="flex items-center gap-6 mt-3 text-muted-foreground">
            {/* 点赞 */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors",
                "hover:text-rose-500",
                hasLiked && "text-rose-500"
              )}
            >
              <Heart
                className={cn("w-4 h-4", hasLiked && "fill-current")}
              />
              <span>{formatNumber(localLikes)}</span>
            </button>

            {/* 浏览量 */}
            <div className="flex items-center gap-1.5 text-sm">
              <Eye className="w-4 h-4" />
              <span>{formatNumber(article.views)}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// 下拉刷新状态
type PullState = "idle" | "pulling" | "ready" | "refreshing";

export default function FeedPage() {
  // 文章列表状态
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 下拉刷新状态
  const [pullState, setPullState] = useState<PullState>("idle");
  const [pullDistance, setPullDistance] = useState(0);

  // 触摸位置记录
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 刷新阈值
  const PULL_THRESHOLD = 80;

  // 加载文章列表
  const loadArticles = useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await articleApi.list(pageNum, PAGE_SIZE);

        if (isRefresh) {
          setArticles(result.articles);
        } else {
          setArticles((prev) => [...prev, ...result.articles]);
        }

        setHasMore(result.articles.length === PAGE_SIZE);
        setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setIsLoading(false);
        setIsInitialLoading(false);
      }
    },
    [isLoading]
  );

  // 初始加载
  useEffect(() => {
    loadArticles(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    setPullState("refreshing");
    await loadArticles(1, true);
    setPullState("idle");
    setPullDistance(0);
  }, [loadArticles]);

  // 加载更多
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadArticles(page + 1);
    }
  }, [isLoading, hasMore, page, loadArticles]);

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;
    if (scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  // 触摸移动
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (pullState === "refreshing") return;

      const scrollTop = scrollContainerRef.current?.scrollTop || 0;
      if (scrollTop > 0) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;

      if (distance > 0) {
        // 阻尼效果
        const dampedDistance = Math.min(distance * 0.5, 120);
        setPullDistance(dampedDistance);

        if (dampedDistance >= PULL_THRESHOLD) {
          setPullState("ready");
        } else {
          setPullState("pulling");
        }
      }
    },
    [pullState]
  );

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    if (pullState === "ready") {
      handleRefresh();
    } else {
      setPullState("idle");
      setPullDistance(0);
    }
  }, [pullState, handleRefresh]);

  // 滚动加载更多
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const { scrollTop, scrollHeight, clientHeight } = target;

      // 距离底部 200px 时加载更多
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMore();
      }
    },
    [loadMore]
  );

  // 点赞处理
  const handleLike = useCallback((articleId: number) => {
    setArticles((prev) =>
      prev.map((article) =>
        article.id === articleId
          ? { ...article, likes: article.likes + 1 }
          : article
      )
    );
  }, []);

  // 点击文章 - 跳转详情页（预留接口）
  const handleArticleClick = useCallback((articleId: number) => {
    // TODO: 跳转到详情页
    console.log("Navigate to article detail:", articleId);
    // 后续可以使用 router.push(`/article/${articleId}`)
  }, []);

  // 渲染下拉刷新提示
  const renderPullIndicator = () => {
    const isActive = pullState !== "idle";
    const isRefreshing = pullState === "refreshing";
    const isReady = pullState === "ready";

    return (
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center transition-all duration-200",
          "text-muted-foreground text-sm"
        )}
        style={{
          top: -50,
          height: 50,
          transform: `translateY(${pullDistance}px)`,
          opacity: isActive ? 1 : 0,
        }}
      >
        {isRefreshing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span>正在刷新...</span>
          </>
        ) : isReady ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            <span>释放立即刷新</span>
          </>
        ) : (
          <>
            <RefreshCw
              className="w-4 h-4 mr-2 transition-transform"
              style={{ transform: `rotate(${pullDistance * 2}deg)` }}
            />
            <span>下拉刷新</span>
          </>
        )}
      </div>
    );
  };

  // 初始加载状态
  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  // 错误状态
  if (error && articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <p className="text-destructive">{error}</p>
        <button
          onClick={() => loadArticles(1, true)}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  // 空状态
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-4xl mb-2">📭</div>
        <p className="text-muted-foreground">暂无内容</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          快去发布第一篇文章吧
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full overflow-hidden">
      {/* 下拉刷新指示器 */}
      {renderPullIndicator()}

      {/* 文章列表 */}
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullState === "idle" ? "transform 0.2s" : "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onScroll={handleScroll}
      >
        {articles.map((article) => (
          <FeedCard
            key={article.id}
            article={article}
            onLike={handleLike}
            onClick={handleArticleClick}
          />
        ))}

        {/* 加载更多状态 */}
        <div className="py-4 text-center text-sm text-muted-foreground">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>加载中...</span>
            </div>
          ) : hasMore ? (
            <span>上滑加载更多</span>
          ) : (
            <span>已经到底啦 ~</span>
          )}
        </div>
      </div>
    </div>
  );
}
