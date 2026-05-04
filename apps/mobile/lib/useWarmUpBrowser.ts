import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";

// Pre-warms the in-app browser so the OAuth tap-to-launch feels instant.
// Recommended by Clerk's Expo OAuth docs.
export const useWarmUpBrowser = () => {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};
