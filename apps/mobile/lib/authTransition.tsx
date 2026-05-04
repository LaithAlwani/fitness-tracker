import { createContext, ReactNode, useCallback, useContext, useState } from "react";

type AuthTransitionContextValue = {
  isTransitioning: boolean;
  message: string;
  beginTransition: (message?: string) => void;
  endTransition: () => void;
};

const AuthTransitionContext = createContext<AuthTransitionContextValue | null>(null);

const DEFAULT_MESSAGE = "Signing you in...";

export function AuthTransitionProvider({ children }: { children: ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const beginTransition = useCallback((nextMessage?: string) => {
    if (nextMessage) setMessage(nextMessage);
    setIsTransitioning(true);
  }, []);

  const endTransition = useCallback(() => {
    setIsTransitioning(false);
    setMessage(DEFAULT_MESSAGE);
  }, []);

  return (
    <AuthTransitionContext.Provider
      value={{ isTransitioning, message, beginTransition, endTransition }}
    >
      {children}
    </AuthTransitionContext.Provider>
  );
}

export function useAuthTransition() {
  const value = useContext(AuthTransitionContext);
  if (!value) {
    throw new Error(
      "useAuthTransition must be used inside <AuthTransitionProvider>",
    );
  }
  return value;
}
