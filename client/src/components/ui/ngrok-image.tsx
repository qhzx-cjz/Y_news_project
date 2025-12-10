"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ImageOff, Loader2 } from "lucide-react";

interface NgrokImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}

/**
 * 自定义图片组件，解决 ngrok 免费版图片无法加载的问题
 * 使用 fetch + ngrok-skip-browser-warning header 获取图片
 */
export function NgrokImage({ src, alt, className, loading = "lazy" }: NgrokImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    async function loadImage() {
      // 如果不是 ngrok URL 或本地 URL，直接使用原始 src
      const isNgrokUrl = src.includes("ngrok") || src.includes("localhost:9080");
      
      if (!isNgrokUrl) {
        // 非 ngrok URL（如 dicebear 头像），直接使用
        if (isMounted) {
          setBlobUrl(src);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(src, {
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // 检查响应类型是否为图片
        const contentType = response.headers.get("content-type");
        if (!contentType?.startsWith("image/")) {
          throw new Error("Not an image");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (isMounted) {
          setBlobUrl(objectUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to load image:", src, err);
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    }

    setIsLoading(true);
    setError(false);
    setBlobUrl(null);
    loadImage();

    return () => {
      isMounted = false;
      // 清理 blob URL
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center bg-muted", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={cn("flex items-center justify-center bg-muted", className)}>
        <ImageOff className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      loading={loading}
    />
  );
}

