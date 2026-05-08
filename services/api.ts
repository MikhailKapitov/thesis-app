import AsyncStorage from "@react-native-community/async-storage";
import * as FileSystem from 'expo-file-system/legacy';

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

  // Uh... So this one is def. overcomplicated, need to test and maybe rewrite it. For some reason, naive FormData multipart breaks it?
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
    if (!userId) throw new Error('User ID not found');

    const accessToken = await this.getAccessToken();
    if (!accessToken) throw new Error('Authentication token missing');

    // Read the file as base64
    const fileBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to binary Uint8Array safely
    const binaryString = atob(fileBase64);
    const binaryData = Uint8Array.from(binaryString, c => c.charCodeAt(0));

    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

    // Helper to encode text as Uint8Array (UTF-8)
    const encoder = new TextEncoder();
    const encode = (str: string) => encoder.encode(str);

    // Build the multipart body segments
    const CRLF = '\r\n';
    
    // Part 1: audio file
    const audioPart = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="audio"; filename="recording.wav"`,
      `Content-Type: audio/wav`,
      '', // empty line before binary
    ].join(CRLF) + CRLF; // need final CRLF to separate headers from binary

    const audioPartEnd = CRLF; // after binary, we add a CRLF before the next boundary

    // Part 2: metadata JSON
    const metadataString = JSON.stringify(metadata);
    const metadataPart = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="metadata"`,
      `Content-Type: application/json`,
      '',
      metadataString,
    ].join(CRLF) + CRLF;

    // Final boundary
    const finalBoundary = `--${boundary}--`;

    // Concatenate all parts into one Uint8Array
    const audioPartBeforeBinary = encode(audioPart);
    const audioPartEndEncoded = encode(audioPartEnd);
    const metadataPartEncoded = encode(metadataPart);
    const finalBoundaryEncoded = encode(finalBoundary);

    // Total length
    const totalLength =
      audioPartBeforeBinary.length +
      binaryData.length +
      audioPartEndEncoded.length +
      metadataPartEncoded.length +
      finalBoundaryEncoded.length;

    const bodyArray = new Uint8Array(totalLength);
    let offset = 0;
    bodyArray.set(audioPartBeforeBinary, offset);
    offset += audioPartBeforeBinary.length;

    bodyArray.set(binaryData, offset);
    offset += binaryData.length;

    bodyArray.set(audioPartEndEncoded, offset);
    offset += audioPartEndEncoded.length;

    bodyArray.set(metadataPartEncoded, offset);
    offset += metadataPartEncoded.length;

    bodyArray.set(finalBoundaryEncoded, offset);

    console.log('[Upload] Sending to', `${API_BASE_URL}/api/v1/recordings`);

    const response = await fetch(`${API_BASE_URL}/api/v1/recordings`, {
      method: 'POST',
      headers: {
        'X-User-Id': userId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyArray,
    });

    const responseText = await response.text();
    console.log('[Upload] Status:', response.status, responseText);

    if (!response.ok) {
      let errorMsg = responseText;
      try {
        const errJson = JSON.parse(responseText);
        errorMsg = errJson.message || errJson.error || responseText;
      } catch {}
      throw new Error(`Upload failed (${response.status}): ${errorMsg}`);
    }

    return JSON.parse(responseText);
  },

  async getNotifications(page = 0, size = 20) {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User ID not found');
    const token = await this.getAccessToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications?page=${page}&size=${size}`, {
      headers: {
        'X-User-Id': userId,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async getUnreadCount() {
    const userId = await this.getUserId();
    const token = await this.getAccessToken();
    console.log('[Notifications] fetch unread count – userId:', userId, 'token:', token?.slice(0, 20) + '...');
    if (!userId || !token) throw new Error('Missing authentication');

    const url = `${API_BASE_URL}/api/v1/notifications/unread-count`;
    console.log('[Notifications] GET', url);
    const res = await fetch(url, {
      headers: {
        'X-User-Id': userId!,
        'Authorization': `Bearer ${token!}`,
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
    const token = await this.getAccessToken();
    await fetch(`${API_BASE_URL}/api/v1/notifications/${id}/read`, {
      method: 'PUT',
      headers: {
        'X-User-Id': userId,
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  async markAllNotificationsRead() {
    const userId = await this.getUserId();
    if (!userId) throw new Error('User ID not found');
    const token = await this.getAccessToken();
    await fetch(`${API_BASE_URL}/api/v1/notifications/read-all`, {
      method: 'PUT',
      headers: {
        'X-User-Id': userId,
        'Authorization': `Bearer ${token}`,
      },
    });
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
