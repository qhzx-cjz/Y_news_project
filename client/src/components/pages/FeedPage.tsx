"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { articleApi, type Article, fixImageUrls } from "@/lib/api";
import { NgrokImage } from "@/components/ui/ngrok-image";
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

// 渲染带标签高亮的文本
interface RenderTextWithTagsProps {
  text: string;
  onTagClick: (tag: string) => void;
}

function RenderTextWithTags({ text, onTagClick }: RenderTextWithTagsProps) {
  // 匹配 #标签 格式
  const tagRegex = /(#[\u4e00-\u9fa5a-zA-Z0-9_]{1,50})(?=\s|$|[^\u4e00-\u9fa5a-zA-Z0-9_#]|$)/g;
  const parts: { type: "text" | "tag"; content: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    // 添加标签前的普通文本
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    // 添加标签
    parts.push({ type: "tag", content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // 添加剩余的普通文本
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return (
    <>
      {parts.map((part, index) =>
        part.type === "tag" ? (
          <span
            key={index}
            className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              // 去掉 # 符号传递标签名
              onTagClick(part.content.slice(1));
            }}
          >
            {part.content}
          </span>
        ) : (
          <span key={index}>{part.content}</span>
        )
      )}
    </>
  );
}

// 单条 Feed 卡片组件
interface FeedCardProps {
  article: Article;
  onLike: (id: number) => void;
  onClick: (id: number) => void;
  onTagClick: (tag: string) => void;
}

function FeedCard({ article, onLike, onClick, onTagClick }: FeedCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState(article.likes);
  const [hasLiked, setHasLiked] = useState(false);

  // 修复图片 URL（将 localhost 替换为当前 API 地址）
  const fixedContent = fixImageUrls(article.content);
  const textContent = extractTextContent(fixedContent);
  const imageUrl = extractFirstImage(fixedContent);
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
              <RenderTextWithTags text={textContent} onTagClick={onTagClick} />
            </p>
          )}

          {/* 图片预览 */}
          {imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border">
              <NgrokImage
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
  const router = useRouter();
  
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
  const isTouchingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // 使用 ref 避免闭包陷阱
  const isLoadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const pullStateRef = useRef<PullState>("idle");

  // 刷新阈值
  const PULL_THRESHOLD = 80;

  // 检查触发器是否在视口内
  const checkTriggerVisible = useCallback(() => {
    const trigger = loadMoreTriggerRef.current;
    const container = scrollContainerRef.current;
    if (!trigger || !container) return false;

    const triggerRect = trigger.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // 检查触发器是否在容器视口内（包含一定的提前量）
    return triggerRect.top < containerRect.bottom + 100;
  }, []);

  // 用 ref 存储 loadArticles 以避免循环依赖
  const loadArticlesRef = useRef<((pageNum: number, isRefresh?: boolean) => Promise<void>) | null>(null);

  // 尝试加载更多（如果触发器可见）
  const tryLoadMore = useCallback(() => {
    if (!isLoadingRef.current && hasMoreRef.current && checkTriggerVisible()) {
      // 使用 setTimeout 确保 DOM 已更新
      setTimeout(() => {
        if (!isLoadingRef.current && hasMoreRef.current && checkTriggerVisible()) {
          loadArticlesRef.current?.(pageRef.current + 1);
        }
      }, 100);
    }
  }, [checkTriggerVisible]);

  // 加载文章列表
  const loadArticles = useCallback(
    async (pageNum: number, isRefresh = false) => {
      // 使用 ref 检查，避免闭包陷阱
      if (isLoadingRef.current) return;

      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const result = await articleApi.list(pageNum, PAGE_SIZE);

        if (isRefresh) {
          setArticles(result.articles);
        } else {
          setArticles((prev) => [...prev, ...result.articles]);
        }

        const newHasMore = result.articles.length === PAGE_SIZE;
        setHasMore(newHasMore);
        hasMoreRef.current = newHasMore;
        setPage(pageNum);
        pageRef.current = pageNum;
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
        setIsInitialLoading(false);
      }
    },
    [] // 移除依赖，使用 ref 代替
  );

  // 保存 loadArticles 到 ref，供 tryLoadMore 使用
  loadArticlesRef.current = loadArticles;

  // 加载更多（手动触发）
  const loadMore = useCallback(() => {
    if (!isLoadingRef.current && hasMoreRef.current) {
      loadArticles(pageRef.current + 1);
    }
  }, [loadArticles]);

  // 下拉刷新
  const handleRefresh = useCallback(async () => {
    pullStateRef.current = "refreshing";
    setPullState("refreshing");
    await loadArticles(1, true);
    pullStateRef.current = "idle";
    setPullState("idle");
    setPullDistance(0);
  }, [loadArticles]);

  // 初始加载
  useEffect(() => {
    loadArticles(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 监听文章列表变化，检查是否需要继续加载
  useEffect(() => {
    // 当文章列表更新后，检查是否需要加载更多以填满屏幕
    if (articles.length > 0 && !isLoading) {
      tryLoadMore();
    }
  }, [articles.length, isLoading, tryLoadMore]);

  // 使用 IntersectionObserver 实现滚动加载
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoadingRef.current && hasMoreRef.current) {
          loadMore();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "100px", // 提前 100px 触发
        threshold: 0,
      }
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [loadMore]);

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // 总是记录起始位置，后续在 move 中判断是否可以下拉
    touchStartY.current = e.touches[0].clientY;
    isTouchingRef.current = true;
  }, []);

  // 触摸移动
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isTouchingRef.current) return;
      if (pullStateRef.current === "refreshing") return;

      const scrollTop = scrollContainerRef.current?.scrollTop || 0;
      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;

      // 只有在顶部且向下拉时才触发下拉刷新
      if (scrollTop <= 0 && distance > 0) {
        // 阻止默认滚动行为，防止浏览器接管
        e.preventDefault();
        
        // 阻尼效果
        const dampedDistance = Math.min(distance * 0.5, 120);
        setPullDistance(dampedDistance);

        if (dampedDistance >= PULL_THRESHOLD) {
          pullStateRef.current = "ready";
          setPullState("ready");
        } else {
          pullStateRef.current = "pulling";
          setPullState("pulling");
        }
      }
    },
    []
  );

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    isTouchingRef.current = false;
    
    if (pullStateRef.current === "ready") {
      pullStateRef.current = "refreshing";
      handleRefresh();
    } else {
      pullStateRef.current = "idle";
      setPullState("idle");
      setPullDistance(0);
    }
  }, [handleRefresh]);

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

  // 点击文章 - 跳转详情页
  const handleArticleClick = useCallback((articleId: number) => {
    router.push(`/article/${articleId}`);
  }, [router]);

  // 点击标签 - 跳转到编辑器并填充标签
  const handleTagClick = useCallback((tag: string) => {
    router.push(`/?page=editor&tag=${encodeURIComponent(tag)}`);
  }, [router]);

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
        className="h-full overflow-y-auto overscroll-none"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullState === "idle" ? "transform 0.2s" : "none",
          WebkitOverflowScrolling: "touch",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onScroll={handleScroll}
      >
        {articles.map((article) => (
          <FeedCard
            key={article.id}
            article={article}
            onLike={handleLike}
            onClick={handleArticleClick}
            onTagClick={handleTagClick}
          />
        ))}

        {/* 滚动加载触发器 */}
        <div ref={loadMoreTriggerRef} className="h-1" />

        {/* 加载更多状态 */}
        <div className="py-4 text-center text-sm text-muted-foreground">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>加载中...</span>
            </div>
          ) : hasMore ? (
            <button
              onClick={loadMore}
              className="px-4 py-2 hover:bg-muted rounded-lg transition-colors"
            >
              点击或上滑加载更多
            </button>
          ) : (
            <span>已经到底啦 ~</span>
          )}
        </div>
      </div>
    </div>
  );
}
