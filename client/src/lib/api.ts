/**
 * API 基础配置
 */
const API_BASE_URL = "http://localhost:9080";

/**
 * 用户信息接口
 */
export interface User {
  id: number;
  username: string;
  avatar?: string;
}

/**
 * 登录响应接口
 */
export interface LoginResponse {
  access_token: string;
  user: User;
}

/**
 * 注册响应接口
 */
export interface RegisterResponse {
  msg: string;
  userId: number;
}

/**
 * API 错误接口
 */
export interface ApiError {
  message: string;
  statusCode: number;
}

/**
 * 封装的 fetch 请求
 */
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

/**
 * 认证相关 API
 */
export const authApi = {
  /**
   * 用户登录
   */
  login: async (username: string, password: string): Promise<LoginResponse> => {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  /**
   * 用户注册
   */
  register: async (username: string, password: string): Promise<RegisterResponse> => {
    return request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  /**
   * 用户登出
   */
  logout: async (): Promise<{ msg: string }> => {
    return request<{ msg: string }>("/auth/logout", {
      method: "POST",
    });
  },
};

/**
 * Token 存储工具
 */
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

/**
 * 用户信息存储工具
 */
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

