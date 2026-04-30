import AsyncStorage from "@react-native-community/async-storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5000";

// Storage keys
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_ID_KEY = "userId";

export const api = {
  // Token management
  async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },

  async getUserId(): Promise<string | null> {
    return AsyncStorage.getItem(USER_ID_KEY);
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  async setUserId(userId: string): Promise<void> {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  },

  async clearTokens(): Promise<void> {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_ID_KEY);
  },

  // Base fetch with auth header
  async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = await this.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    return response;
  },

  // Auth endpoints
  async register(data: {
    email: string;
    password: string;
    displayName: string;
    language: string;
    deviceModel: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const response = await this.fetch("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Registration failed");
    }
    return response.json();
  },

  async login(data: { email: string; password: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const response = await this.fetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Login failed");
    }
    return response.json();
  },

  async getMe(): Promise<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    language: string;
    deviceModel: string;
    calibrationOffset: number;
    createdAt: string;
  }> {
    const userId = await this.getUserId();
    if (!userId) throw new Error("No user ID found");

    const response = await this.fetch("/api/v1/users/me", {
      headers: {
        "X-User-Id": userId,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }
    return response.json();
  },

  // Helper: after login/register, store tokens and extract user ID from JWT
  async authenticate(authResponse: {
    accessToken: string;
    refreshToken: string;
  }) {
    await this.setTokens(authResponse.accessToken, authResponse.refreshToken);
    const userId = decodeUserIdFromToken(authResponse.accessToken);
    if (userId) {
      await this.setUserId(userId);
    }
    return userId;
  },
};

// Simple JWT decode (without validation) to extract user ID from payload
function decodeUserIdFromToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || payload.userId || payload.id || null;
  } catch {
    return null;
  }
}
