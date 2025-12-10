"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { articleApi, tokenStorage, userStorage, type Article } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ArrowLeft, Heart, Eye, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import BottomNav, { type PageType } from "@/components/BottomNav";

// 格式化详细时间显示
function formatDetailTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

// 从 HTML 内容中提取所有图片
function extractAllImages(html: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
  const images: string[] = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    images.push(match[1]);
  }
  return images;
}

// 从 HTML 内容中提取纯文本
function extractTextContent(html: string): string {
  const withoutImages = html.replace(/<img[^>]*>/g, "");
  const text = withoutImages
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
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

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = Number(params.articleId);

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  
  // 溢出菜单状态
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 检查当前用户是否是文章作者
  const isAuthor = () => {
    const user = userStorage.get();
    return user && article && user.id === article.authorId;
  };
  
  // 检查是否已登录
  const isLoggedIn = () => {
    return !!tokenStorage.get();
  };

  // 加载文章详情
  useEffect(() => {
    const loadArticle = async () => {
      if (!articleId || isNaN(articleId)) {
        setError("无效的文章ID");
        setIsLoading(false);
        return;
      }

      try {
        const data = await articleApi.get(articleId);
        setArticle(data);
        setLocalLikes(data.likes);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setIsLoading(false);
      }
    };

    loadArticle();
  }, [articleId]);

  // 返回主页
  const handleBack = () => {
    router.push("/");
  };

  // 底部导航处理
  const handlePageChange = (page: PageType) => {
    // 跳转到首页并传递目标页面参数
    if (page === "feed") {
      router.push("/");
    } else {
      router.push(`/?page=${page}`);
    }
  };

  // 点击标签 - 跳转到编辑器并填充标签
  const handleTagClick = (tag: string) => {
    router.push(`/?page=editor&tag=${encodeURIComponent(tag)}`);
  };

  // 删除文章
  const handleDelete = async () => {
    if (!article || isDeleting) return;
    
    const confirmed = window.confirm("确定要删除这篇文章吗？此操作不可撤销。");
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      await articleApi.delete(article.id);
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
      setIsDeleting(false);
    }
  };

  // 编辑文章
  const handleEdit = () => {
    if (!article) return;
    // 将文章数据编码到 URL 参数中
    const editData = encodeURIComponent(JSON.stringify({
      id: article.id,
      title: article.title,
      content: article.content,
    }));
    router.push(`/?page=editor&edit=${editData}`);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  // 点赞处理
  const handleLike = async () => {
    if (isLiking || hasLiked || !article) return;

    setIsLiking(true);
    try {
      const result = await articleApi.like(article.id);
      setLocalLikes(result.likes);
      setHasLiked(true);
    } catch {
      // 忽略错误
    } finally {
      setIsLiking(false);
    }
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-14">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center h-12 px-4">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="ml-4 text-lg font-semibold">帖子</h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
        </div>

        <BottomNav currentPage="feed" onPageChange={handlePageChange} />
      </div>
    );
  }

  // 错误状态
  if (error || !article) {
    return (
      <div className="flex flex-col min-h-screen bg-background pb-14">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="flex items-center h-12 px-4">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="ml-4 text-lg font-semibold">帖子</h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-destructive">{error || "文章不存在"}</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
          >
            返回首页
          </button>
        </div>

        <BottomNav currentPage="feed" onPageChange={handlePageChange} />
      </div>
    );
  }

  const authorAvatar =
    article.author?.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${article.author?.username || "user"}`;
  const textContent = extractTextContent(article.content);
  const images = extractAllImages(article.content);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-14">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="ml-4 text-lg font-semibold">帖子</h1>
          </div>
          
          {/* 溢出菜单 - 只有作者本人可见 */}
          {isLoggedIn() && isAuthor() && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <MoreVertical className="w-5 h-5" />
                )}
              </button>
              
              {/* 下拉菜单 */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-20">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleEdit();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>编辑文章</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleDelete();
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>删除文章</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 文章详情内容 */}
      <main className="flex-1 overflow-y-auto">
        <article className="px-4 py-3">
          {/* 作者信息区域 */}
          <div className="flex items-center gap-3">
            <img
              src={authorAvatar}
              alt={article.author?.username || "用户"}
              className="w-12 h-12 rounded-full bg-muted flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold">
                {article.author?.username || "匿名用户"}
              </div>
              <div className="text-sm text-muted-foreground">
                @{article.author?.username || "anonymous"}
              </div>
            </div>
          </div>

          {/* 文章标题 */}
          {article.title && (
            <h2 className="text-xl font-bold mt-4">{article.title}</h2>
          )}

          {/* 文章正文 */}
          {textContent && (
            <div className="mt-4 text-base leading-relaxed whitespace-pre-wrap">
              <RenderTextWithTags text={textContent} onTagClick={handleTagClick} />
            </div>
          )}

          {/* 图片展示区域 */}
          {images.length > 0 && (
            <div
              className={cn(
                "mt-4 gap-2",
                images.length === 1
                  ? "block"
                  : "grid grid-cols-2"
              )}
            >
              {images.map((src, index) => (
                <div
                  key={index}
                  className={cn(
                    "rounded-xl overflow-hidden border border-border",
                    images.length === 1 && "max-w-full"
                  )}
                >
                  <img
                    src={src}
                    alt={`图片 ${index + 1}`}
                    className={cn(
                      "w-full object-cover",
                      images.length === 1 ? "max-h-[500px]" : "aspect-square"
                    )}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 发布时间 */}
          <div className="mt-4 py-3 text-sm text-muted-foreground border-b border-border">
            {formatDetailTime(article.createdAt)}
          </div>

          {/* 互动数据统计 */}
          <div className="py-3 border-b border-border">
            <div className="flex items-center gap-6">
              {/* 点赞数 */}
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  "hover:text-rose-500",
                  hasLiked && "text-rose-500"
                )}
              >
                <Heart
                  className={cn("w-5 h-5", hasLiked && "fill-current")}
                />
                <span className="font-semibold">{formatNumber(localLikes)}</span>
                <span className="text-muted-foreground">喜欢</span>
              </button>

              {/* 浏览量 */}
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">{formatNumber(article.views)}</span>
                <span className="text-muted-foreground">查看</span>
              </div>
            </div>
          </div>
        </article>
      </main>

      {/* 底部导航栏 */}
      <BottomNav currentPage="feed" onPageChange={handlePageChange} />
    </div>
  );
}

