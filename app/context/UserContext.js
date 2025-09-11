import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/router";

const BASE_STORAGE_KEY = "selectedUser";

function storageKeyFor(industry) {
  const normalized = industry === "manufacturing" ? "manufacturing" : "retail";
  return `${BASE_STORAGE_KEY}:${normalized}`;
}
export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState(null);
  const industry =
    router.query.industry === "manufacturing" ? "manufacturing" : "retail";

  // Load user from localStorage on initial load and when industry changes
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(storageKeyFor(industry));
      setSelectedUser(storedUser ? JSON.parse(storedUser) : null);
    } catch (e) {
      console.error("Failed to load stored user:", e);
      setSelectedUser(null);
    }
  }, [industry]);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    try {
      const key = storageKeyFor(industry);
      if (selectedUser) {
        localStorage.setItem(key, JSON.stringify(selectedUser));
      } else {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error("Failed to persist user:", e);
    }
  }, [selectedUser, industry]);

  // Redirect to default location if not set
  useEffect(() => {
    const currentLocation = router.query.location;
    const defaultLocation = selectedUser?.permissions?.locations?.[0]?.id;

    if (!currentLocation && defaultLocation) {
      router.replace({
        pathname: router.pathname,
        query: {
          ...router.query,
          location: defaultLocation,
        },
      });
    }
  }, [router, selectedUser]);

  // Utility function to start an SSE connection
  const startSSE = useCallback((path, onMessage, onError) => {
    const eventSource = new EventSource(path);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
    };

    eventSource.onerror = (error) => {
      console.error(`SSE error on ${path}:`, error);
      eventSource.close();

      if (onError) onError(error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        selectedUser,
        setSelectedUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    console.error("useUser must be used within a UserProvider");
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
