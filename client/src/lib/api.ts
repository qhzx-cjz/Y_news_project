
const API_BASE_URL = "http://localhost:9080";


export interface User {
  id: number;
  username: string;
  avatar?: string;
}


export interface LoginResponse {
  access_token: string;
  user: User;
}


export interface RegisterResponse {
  msg: string;
  userId: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "请求失败");
  }

  return response.json();
}


export const authApi = {

  login: async (username: string, password: string): Promise<LoginResponse> => {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },


  register: async (username: string, password: string): Promise<RegisterResponse> => {
    return request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  logout: async (): Promise<{ msg: string }> => {
    return request<{ msg: string }>("/auth/logout", {
      method: "POST",
    });
  },
};


export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("access_token");
  },
  
  set: (token: string): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem("access_token", token);
  },
  
  remove: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("access_token");
  },
};

export const userStorage = {
  get: (): User | null => {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem("user");
    return data ? JSON.parse(data) : null;
  },
  
  set: (user: User): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem("user", JSON.stringify(user));
  },
  
  remove: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("user");
  },
};


//草稿和文章
export interface Draft {
  id?: number;
  title: string;
  content: string;
  updatedAt: string;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  authorId: number;
  author?: User;
  createdAt: string;
  updatedAt: string;
}

// 带认证的请求
async function authRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = tokenStorage.get();
  
  return request<T>(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// 草稿 API
export const draftApi = {
  // 获取当前用户的草稿
  get: async (): Promise<Draft | null> => {
    try {
      return await authRequest<Draft>("/draft");
    } catch {
      return null;
    }
  },

  // 保存草稿
  save: async (title: string, content: string): Promise<Draft> => {
    return authRequest<Draft>("/draft", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    });
  },

  // 删除草稿
  delete: async (): Promise<{ msg: string }> => {
    return authRequest<{ msg: string }>("/draft", {
      method: "DELETE",
    });
  },
};

// 文章 API
export const articleApi = {
  // 发布文章
  publish: async (title: string, content: string): Promise<Article> => {
    return authRequest<Article>("/articles", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    });
  },

  // 获取文章列表（Feed流）
  list: async (page = 1, limit = 10): Promise<{ articles: Article[]; total: number }> => {
    return request<{ articles: Article[]; total: number }>(
      `/articles?page=${page}&limit=${limit}`
    );
  },

  // 获取单篇文章
  get: async (id: number): Promise<Article> => {
    return request<Article>(`/articles/${id}`);
  },

  // 更新文章（二次编辑）
  update: async (id: number, title: string, content: string): Promise<Article> => {
    return authRequest<Article>(`/articles/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title, content }),
    });
  },

  // 删除文章
  delete: async (id: number): Promise<{ msg: string }> => {
    return authRequest<{ msg: string }>(`/articles/${id}`, {
      method: "DELETE",
    });
  },
};

// 上传响应类型
export interface UploadResponse {
  url: string;
  filename: string;
}

// 上传 API
export const uploadApi = {
  // 上传图片
  image: async (file: File): Promise<UploadResponse> => {
    const token = tokenStorage.get();

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/upload/image`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "上传失败");
    }

    return response.json();
  },
};

//本地草稿存储

export interface LocalDraft {
  title: string;
  content: string;
  updatedAt: string;
  syncedAt?: string; // 最后同步到云端的时间
  needsSync: boolean; // 是否需要同步
}

const LOCAL_DRAFT_KEY = "editor_draft";

export const localDraftStorage = {
  get: (): LocalDraft | null => {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(LOCAL_DRAFT_KEY);
    return data ? JSON.parse(data) : null;
  },

  set: (draft: LocalDraft): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
  },

  remove: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LOCAL_DRAFT_KEY);
  },

  // 标记为需要同步
  markNeedsSync: (): void => {
    const draft = localDraftStorage.get();
    if (draft) {
      draft.needsSync = true;
      localDraftStorage.set(draft);
    }
  },

  // 标记为已同步
  markSynced: (): void => {
    const draft = localDraftStorage.get();
    if (draft) {
      draft.needsSync = false;
      draft.syncedAt = new Date().toISOString();
      localDraftStorage.set(draft);
    }
  },
};
