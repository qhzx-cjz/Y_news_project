
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

