import AsyncStorage from "@react-native-community/async-storage";
// import { File } from 'expo-file-system';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5000";

// Storage keys
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_ID_KEY = "userId";

// Refresh lock
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh token invalid or expired.
      return null;
    }

    const data = await response.json();
    const { accessToken, refreshToken: newRefreshToken } = data;

    if (accessToken) {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (newRefreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      }
      return accessToken;
    }
    return null;
  } catch (err) {
    console.warn('[API] Refresh network error:', err);
    return null;
  }
}

async function tryRefreshToken(): Promise<string | null> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) return refreshPromise;

  refreshPromise = refreshAccessToken().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// ─── Main API object ────────────────────────────────────
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
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, accessToken],
      [REFRESH_TOKEN_KEY, refreshToken],
    ]);
  },

  async setUserId(userId: string): Promise<void> {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  },

  async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_ID_KEY]);
  },

  // Core fetch with automatic token refresh.
  async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    let accessToken = await this.getAccessToken();
    const isFormData = options.body instanceof FormData;

    const buildHeaders = (token: string | null) => {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      };
      // Only set default Content-Type for non‑FormData requests
      if (!isFormData && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      return headers;
    };

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: buildHeaders(accessToken),
    });

    // Token refresh
    if (response.status === 401 && accessToken) {
      console.log('[API] Received 401, attempting token refresh...');
      const newToken = await tryRefreshToken();
      if (newToken) {
        console.log('[API] Token refreshed, retrying request...');
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: buildHeaders(newToken),
        });
      } else {
        console.warn('[API] Refresh failed, logging out...');
        await this.clearTokens();
        throw new Error('Session expired. Please log in again.');
      }
    }

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

  // YAY.
  async uploadRecording(
    audioUri: string,
    metadata: {
      latitude: number;
      longitude: number;
      deviceModel: string;
      recordedAt: string;
    }
  ): Promise<any> {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User ID   not found');

    const formData = new FormData();

    // Standard React Native file upload shape – works with any URI string
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/wav',
      name: 'recording.wav',
    } as any);

    // Server now expects separate fields, not a metadata JSON
    formData.append('latitude', String(metadata.latitude));
    formData.append('longitude', String(metadata.longitude));
    formData.append('deviceModel', metadata.deviceModel);
    formData.append('recordedAt', metadata.recordedAt);

    const response = await this.fetch('/api/v1/recordings', {
      method: 'POST',
      headers: {
        'X-User-Id': userId,
        // No Content-Type – fetch will set multipart/form-data automatically
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed (${response.status}): ${errorText}`);
    }
    return response.json();
  },

  async getNotifications(page = 0, size = 20) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User ID not found');
    const res = await this.fetch(`/api/v1/notifications?page=${page}&size=${size}`, {
      headers: {
        'X-User-Id': userId,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async getUnreadCount() {
    const userId = await this.getUserId();
    if (!userId) throw new Error('Missing authentication');

    console.log('[Notifications] fetch unread count - userId:', userId);
    const res = await this.fetch(`/api/v1/notifications/unread-count`, {
      headers: {
        'X-User-Id': userId,
      },
    });

    const text = await res.text();
    console.log('[Notifications] Response status:', res.status, 'body:', text);
    if (!res.ok) throw new Error(`Failed to fetch unread count – ${res.status}: ${text}`);
    return JSON.parse(text).count ?? 0;
  },

  async markNotificationRead(id: string) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User ID not found');
    await this.fetch(`/api/v1/notifications/${id}/read`, {
      method: 'PUT',
      headers: {
        'X-User-Id': userId,
      },
    });
  },

  async markAllNotificationsRead() {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User ID not found');
    await this.fetch(`/api/v1/notifications/read-all`, {
      method: 'PUT',
      headers: {
        'X-User-Id': userId,
      },
    });
  },

  async getGamificationProfile() {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User ID not found');
    const res = await this.fetch(`/api/v1/gamification/me`, {
      headers: {
        'X-User-Id': userId,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch gamification profile');
    return res.json();
  },

  async getLeaderboard(limit = 20) {
    const res = await this.fetch(`/api/v1/gamification/leaderboard?limit=${limit}`, {
      headers: {
      },
    });
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return res.json();
  },

  async getCityStats() {
    const res = await this.fetch(`/api/v1/stats/city`);
    if (!res.ok) throw new Error('Failed to fetch city statistics');
    return res.json();
  },

  async getMyStats() {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User ID not found');
    const res = await this.fetch(`/api/v1/stats/me`, {
      headers: {
        'X-User-Id': userId,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch personal statistics');
    return res.json();
  },

  async addComment(comment: {
    latitude: number;
    longitude: number;
    text: string;
    noiseClass?: string;
    noiseLevelDba?: number;
  }) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User ID not found');
    const cachedUser = await AsyncStorage.getItem('cachedUser');
    let displayName = 'Anonymous'; // TODO.
    if (cachedUser) {
      try { displayName = JSON.parse(cachedUser).displayName; } catch {}
    }

    const response = await this.fetch('/api/v1/comments', {
      method: 'POST',
      headers: {
        'X-User-Id': userId,
        'X-Display-Name': displayName,
      },
      body: JSON.stringify(comment),
    });
    if (!response.ok) throw new Error('Failed to add comment');
    return response.json();
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