import React, { createContext, useState, useContext, useEffect } from "react";
import * as Device from "expo-device";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-community/async-storage";
import { api } from "@/services/api";

const USER_STORAGE_KEY = "cachedUser";

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  language: string;
  deviceModel: string;
  calibrationOffset: number;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isOffline: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<User>; // <-- Changed from Promise<void> to Promise<User>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Save user to AsyncStorage cache
  const cacheUser = async (userData: User) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    } catch (e) {
      console.warn("Failed to cache user", e);
    }
  };

  // Load cached user from AsyncStorage
  const loadCachedUser = async (): Promise<User | null> => {
    try {
      const cached = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached) as User;
      }
    } catch (e) {
      console.warn("Failed to load cached user", e);
    }
    return null;
  };

  const clearCachedUser = async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {
      console.warn("Failed to clear cached user", e);
    }
  };

  // Refresh profile from server (called after login/register or manually)
  const refreshProfile = async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
      await cacheUser(profile);
      setIsOffline(false);
      return profile;
    } catch (e) {
      console.warn("Failed to refresh profile", e);
      throw e;
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      console.log("[Auth] loadUser started");
      try {
        const token = await api.getAccessToken();
        const userId = await api.getUserId();
        console.log(
          "[Auth] Stored token:",
          token ? token.slice(0, 20) + "..." : null,
        );
        console.log("[Auth] Stored userId:", userId);

        if (token && userId) {
          console.log("[Auth] Attempting to fetch /me...");
          try {
            const profile = await api.getMe();
            console.log("[Auth] /me succeeded, setting user:", profile.email);
            setUser(profile);
            await cacheUser(profile);
            setIsOffline(false);
          } catch (fetchError: any) {
            // Network error or server unreachable – fall back to cached user
            if (
              fetchError.message?.includes("Network request failed") ||
              fetchError.message?.includes("Failed to fetch")
            ) {
              console.warn("[Auth] Network error, loading cached user");
              const cachedUser = await loadCachedUser();
              if (cachedUser) {
                console.log("[Auth] Using cached user:", cachedUser.email);
                setUser(cachedUser);
                setIsOffline(true);
              } else {
                // No cached user – stay logged out
                console.log("[Auth] No cached user available");
                setUser(null);
              }
            } else {
              // Auth error (401/403) – clear tokens
              console.error("[Auth] Auth error during /me:", fetchError);
              await api.clearTokens();
              await clearCachedUser();
              setUser(null);
            }
          }
        } else {
          console.log("[Auth] No credentials, user remains null");
          setUser(null);
        }
      } catch (e) {
        console.error("[Auth] Unexpected error during loadUser:", e);
        setUser(null);
      } finally {
        console.log("[Auth] loadUser finished, isLoading -> false");
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const authResponse = await api.login({ email, password });
    await api.authenticate(authResponse);
    const profile = await refreshProfile();
    setUser(profile);
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
  ) => {
    const locales = Localization.getLocales();
    const language = locales[0]?.languageCode || "en";
    const deviceModel = Device.modelName || "Unknown";

    const authResponse = await api.register({
      email,
      password,
      displayName,
      language,
      deviceModel,
    });
    await api.authenticate(authResponse);
    const profile = await refreshProfile();
    setUser(profile);
  };

  const logout = async () => {
    await api.clearTokens();
    await clearCachedUser();
    setUser(null);
    setIsOffline(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isOffline,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
