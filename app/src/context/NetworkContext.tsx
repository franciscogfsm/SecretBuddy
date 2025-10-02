import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  PropsWithChildren,
} from "react";
import { Platform } from "react-native";

interface NetworkContextValue {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

const NetworkContext = createContext<NetworkContextValue>({
  isConnected: true,
  isInternetReachable: true,
});

/**
 * NetworkProvider - Detects and manages network connectivity state
 *
 * This provider monitors the device's network connection and provides
 * real-time connectivity status to the app. It handles both network
 * availability and actual internet reachability.
 *
 * Features:
 * - Detects when device goes offline/online
 * - Monitors actual internet reachability (not just wifi connection)
 * - Works across all platforms (iOS, Android, Web)
 * - Automatic reconnection detection
 */
export const NetworkProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<
    boolean | null
  >(true);

  useEffect(() => {
    // For web platform, use online/offline events
    if (Platform.OS === "web") {
      const handleOnline = () => {
        setIsConnected(true);
        setIsInternetReachable(true);
      };

      const handleOffline = () => {
        setIsConnected(false);
        setIsInternetReachable(false);
      };

      // Set initial state
      setIsConnected(navigator.onLine);
      setIsInternetReachable(navigator.onLine);

      // Listen for online/offline events
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    // For native platforms (iOS/Android)
    // We'll use a simple fetch-based approach to check connectivity
    const checkConnectivity = async () => {
      try {
        // Try to fetch a small resource from a reliable server
        const response = await fetch("https://www.google.com/favicon.ico", {
          method: "HEAD",
          cache: "no-cache",
        });

        if (response.ok) {
          setIsConnected(true);
          setIsInternetReachable(true);
        } else {
          setIsConnected(false);
          setIsInternetReachable(false);
        }
      } catch (error) {
        setIsConnected(false);
        setIsInternetReachable(false);
      }
    };

    // Check connectivity immediately
    checkConnectivity();

    // Check connectivity every 10 seconds
    const interval = setInterval(checkConnectivity, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected, isInternetReachable }}>
      {children}
    </NetworkContext.Provider>
  );
};

/**
 * useNetwork - Hook to access network connectivity state
 *
 * @returns {NetworkContextValue} Network state object
 *
 * @example
 * const { isConnected, isInternetReachable } = useNetwork();
 *
 * if (!isConnected) {
 *   return <OfflineScreen />;
 * }
 */
export const useNetwork = (): NetworkContextValue => {
  const context = useContext(NetworkContext);

  if (!context) {
    throw new Error("useNetwork must be used within NetworkProvider");
  }

  return context;
};
