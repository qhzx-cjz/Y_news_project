"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  draftApi,
  articleApi,
  localDraftStorage,
  tokenStorage,
  type LocalDraft,
} from "@/lib/api";
import {
  Save,
  Send,
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const AUTO_SAVE_INTERVAL = 30000; 

// 保存状态类型
type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

interface EditArticleData {
  id: number;
  title: string;
  content: string;
}

interface EditorPageProps {
  initialTag?: string; // 初始标签（从 URL 参数传入）
  editArticle?: EditArticleData; // 编辑模式：要编辑的文章数据
}

export default function EditorPage({ initialTag, editArticle }: EditorPageProps) {
  // 编辑器内容状态
  const [title, setTitle] = useState(editArticle?.title || "");
  const [content, setContent] = useState(editArticle?.content || "");
  
  // 编辑模式状态
  const [editingArticleId, setEditingArticleId] = useState<number | null>(editArticle?.id || null);
  
  // UI 状态
  const [isOnline, setIsOnline] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // 标记内容是否有变化
  const [hasChanges, setHasChanges] = useState(false);
  
  // 避免SSR错误
  const [hasMounted, setHasMounted] = useState(false);
  
  // 定时器引用
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 用于防止初始化时重复加载草稿
  const isInitializedRef = useRef(false);

  // 检查是否已登录（只在客户端挂载后才真正检查）
  const isLoggedIn = useCallback(() => {
    if (!hasMounted) return false; // 服务端渲染时始终返回 false
    return !!tokenStorage.get();
  }, [hasMounted]);
  
  // 客户端挂载后设置状态
  useEffect(() => {
    const init = () => {
      setHasMounted(true);
    };
    init();
  }, []);

  // 保存到本地
  const saveToLocal = useCallback((titleValue: string, contentValue: string) => {
    const draft: LocalDraft = {
      title: titleValue,
      content: contentValue,
      updatedAt: new Date().toISOString(),
      needsSync: true,
    };
    localDraftStorage.set(draft);
  }, []);

  // 同步到云端
  const syncToCloud = useCallback(async () => {
    if (!isLoggedIn() || !isOnline) {
      return false;
    }

    const localDraft = localDraftStorage.get();
    if (!localDraft) return false;

    try {
      await draftApi.save(localDraft.title, localDraft.content);
      localDraftStorage.markSynced();
      return true;
    } catch {
      return false;
    }
  }, [isLoggedIn, isOnline]);

  // 执行保存操作
  const performSave = useCallback(async () => {
    if (!title.trim() && !content.trim()) {
      return; 
    }

    setSaveStatus("saving");

    // 1. 先保存到本地
    saveToLocal(title, content);

    // 2. 尝试同步到云端
    if (isOnline && isLoggedIn()) {
      const synced = await syncToCloud();
      if (synced) {
        setSaveStatus("saved");
        setLastSavedAt(new Date());
      } else {
        setSaveStatus("offline");
      }
    } else {
      setSaveStatus(isOnline ? "saved" : "offline");
      setLastSavedAt(new Date());
    }

    setHasChanges(false);

    // 3秒后恢复 idle 状态
    setTimeout(() => {
      setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
    }, 3000);
  }, [title, content, isOnline, isLoggedIn, saveToLocal, syncToCloud]);

  // 手动保存
  const handleManualSave = useCallback(async () => {
    await performSave();
  }, [performSave]);

  // 发布或更新文章
  const handlePublish = useCallback(async () => {
    if (!title.trim()) {
      setMessage({ type: "error", text: "请输入文章标题" });
      return;
    }

    if (!content.trim() || content === "<p></p>") {
      setMessage({ type: "error", text: "请输入文章内容" });
      return;
    }

    if (!isLoggedIn()) {
      setMessage({ type: "error", text: "请先登录后再发布" });
      return;
    }

    if (!isOnline) {
      setMessage({ type: "error", text: "网络已断开，请恢复网络后再发布" });
      return;
    }

    setIsPublishing(true);
    setMessage(null);

    try {
      if (editingArticleId) {
        // 编辑模式：更新文章
        await articleApi.update(editingArticleId, title, content);
        setMessage({ type: "success", text: "🎉 文章已更新！" });
        // 更新成功后退出编辑模式
        setEditingArticleId(null);
      } else {
        // 新建模式：发布文章
        await articleApi.publish(title, content);
        setMessage({ type: "success", text: "🎉 发布成功！" });
      }
      
      // 成功后清除草稿
      localDraftStorage.remove();
      await draftApi.delete().catch(() => {});
      
      // 清空编辑器
      setTitle("");
      setContent("");
      setHasChanges(false);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : (editingArticleId ? "更新失败，请重试" : "发布失败，请重试"),
      });
    } finally {
      setIsPublishing(false);
    }
  }, [title, content, isLoggedIn, isOnline, editingArticleId]);

  // 标题变化处理
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  }, []);

  // 内容变化处理
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  }, []);

  // 初始化：加载草稿
  useEffect(() => {
    // 防止重复初始化
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const loadDraft = async () => {
      // 1. 优先从本地加载
      const localDraft = localDraftStorage.get();
      
      if (localDraft) {
        setTitle(localDraft.title);
        setContent(localDraft.content);
      }

      // 2. 如果在线且已登录，尝试从云端加载
      const online = navigator.onLine;
      const loggedIn = !!tokenStorage.get();
      
      if (online && loggedIn) {
        try {
          const cloudDraft = await draftApi.get();
          
          if (cloudDraft) {
            // 比较本地和云端草稿的更新时间
            const localTime = localDraft ? new Date(localDraft.updatedAt).getTime() : 0;
            const cloudTime = new Date(cloudDraft.updatedAt).getTime();

            // 使用更新的那个
            if (cloudTime > localTime) {
              setTitle(cloudDraft.title);
              setContent(cloudDraft.content);
              // 同步到本地
              const draft: LocalDraft = {
                title: cloudDraft.title,
                content: cloudDraft.content,
                updatedAt: cloudDraft.updatedAt,
                needsSync: false,
                syncedAt: cloudDraft.updatedAt,
              };
              localDraftStorage.set(draft);
            } else if (localDraft?.needsSync) {
              // 本地有未同步的更新，同步到云端
              try {
                await draftApi.save(localDraft.title, localDraft.content);
                localDraftStorage.markSynced();
              } catch {
                // 同步失败，稍后重试
              }
            }
          }
        } catch {
          // 云端加载失败，使用本地草稿
        }
      }
    };

    loadDraft();
  }, []); // 只在组件挂载时执行一次

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      // 网络恢复后，尝试同步未保存的草稿
      const localDraft = localDraftStorage.get();
      if (localDraft?.needsSync && isLoggedIn()) {
        syncToCloud().then((synced) => {
          if (synced) {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 3000);
          }
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus("offline");
    };

    // 初始化网络状态
    setIsOnline(navigator.onLine);
    // if(navigator.onLine) {
    //   console.log("在线");
    // }else{
    //   console.log("离线");
    // }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isLoggedIn, syncToCloud]);

  // 自动保存定时器
  useEffect(() => {
    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // 设置新的定时器
    autoSaveTimerRef.current = setInterval(() => {
      if (hasChanges) {
        performSave();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [hasChanges, performSave]);

  // 页面离开前保存
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        // 同步保存到本地
        saveToLocal(title, content);
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges, title, content, saveToLocal]);

  // 清除消息定时器
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 处理从 URL 传入的初始标签
  useEffect(() => {
    if (initialTag && !editArticle) {
      // 在内容开头添加标签（如果内容为空或只是空段落）
      const tagText = `#${initialTag} `;
      setContent((prevContent) => {
        if (!prevContent.trim() || prevContent === "<p></p>") {
          return `<p>${tagText}</p>`;
        }
        // 如果已有内容且不包含该标签，在末尾添加
        if (!prevContent.includes(`#${initialTag}`)) {
          if (prevContent.endsWith("</p>")) {
            return prevContent.slice(0, -4) + ` ${tagText}</p>`;
          }
          return prevContent + `<p>${tagText}</p>`;
        }
        return prevContent;
      });
      setHasChanges(true);
    }
  }, [initialTag, editArticle]); // 只在 initialTag 变化时执行

  // 处理编辑模式：填充文章内容
  useEffect(() => {
    if (editArticle) {
      setTitle(editArticle.title);
      setContent(editArticle.content);
      setEditingArticleId(editArticle.id);
      setHasChanges(false);
    }
  }, [editArticle]);

  // 渲染保存状态指示器
  const renderSaveStatus = () => {
    const statusConfig = {
      idle: { icon: null, text: "", className: "" },
      saving: {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        text: "保存中...",
        className: "text-muted-foreground",
      },
      saved: {
        icon: <CheckCircle className="w-4 h-4" />,
        text: lastSavedAt
          ? `已保存 ${lastSavedAt.toLocaleTimeString()}`
          : "已保存",
        className: "text-green-600",
      },
      error: {
        icon: <AlertCircle className="w-4 h-4" />,
        text: "保存失败",
        className: "text-destructive",
      },
      offline: {
        icon: <CloudOff className="w-4 h-4" />,
        text: "离线模式（已保存到本地）",
        className: "text-amber-600",
      },
    };

    const config = statusConfig[saveStatus];
    if (!config.icon) return null;

    return (
      <div className={cn("flex items-center gap-1.5 text-sm", config.className)}>
        {config.icon}
        <span>{config.text}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-6">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          {/* 网络状态指示 */}
          <div
            className={cn(
              "flex items-center gap-1 text-sm px-2 py-1 rounded-full",
              isOnline
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            )}
          >
            {isOnline ? (
              <Cloud className="w-3.5 h-3.5" />
            ) : (
              <CloudOff className="w-3.5 h-3.5" />
            )}
          </div>

          {/* 保存状态 */}
          {renderSaveStatus()}
        </div>

        <div className="flex items-center gap-2">
          {/* 保存按钮 - 编辑模式下隐藏 */}
          {!editingArticleId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSave}
              disabled={saveStatus === "saving" || (!title.trim() && !content.trim())}
            >
              <Save className="w-4 h-4 mr-1.5" />
              保存草稿
            </Button>
          )}

          {/* 发布/更新按钮 */}
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing || !isLoggedIn()}
            title={!isLoggedIn() ? "请先登录" : ""}
          >
            {isPublishing ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            {editingArticleId ? "更新" : "发布"}
          </Button>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className={cn(
            "mb-4 p-3 rounded-lg text-sm",
            message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {message.text}
        </div>
      )}

      {/* 编辑模式提示 */}
      {editingArticleId && (
        <div className="mb-4 p-3 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-sm">
          ✏️ 编辑模式：修改后点击「更新」按钮保存更改
        </div>
      )}

      {/* 未登录提示 */}
      {!isLoggedIn() && (
        <div className="mb-4 p-3 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-sm">
          💡 登录后可将草稿同步到云端，并支持发布文章
        </div>
      )}

      {/* 标题输入 */}
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="输入文章标题..."
        className={cn(
          "w-full text-2xl font-bold mb-4 px-4 py-3",
          "bg-transparent border-0 border-b-2 border-muted-foreground/20",
          "focus:outline-none focus:border-primary",
          "transition-colors placeholder:text-muted-foreground/50"
        )}
      />

      {/* 富文本编辑器 */}
      <div className="flex-1 min-h-0">
        <RichTextEditor
          content={content}
          onChange={handleContentChange}
          placeholder="开始编写你的内容，使用#添加标签，使用空格分隔各个标签..."
          className="h-full min-h-[400px]"
        />
      </div>

      {/* 底部提示 */}
      <div className="mt-4 text-xs text-muted-foreground text-center">
        草稿每 30 秒自动保存 · 断网时自动保存到本地 · 恢复网络后自动同步
      </div>
    </div>
  );
}
