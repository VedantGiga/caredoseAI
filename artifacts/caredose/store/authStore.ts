import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export interface User {
  id: string; // Firebase uid
  name: string;
  email: string;
  photoURL?: string;
  createdAt?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token?: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (user, token = null) => set({ user, token, isAuthenticated: true }),
      logout: () => {
        signOut(auth);
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: "caredose-auth",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
