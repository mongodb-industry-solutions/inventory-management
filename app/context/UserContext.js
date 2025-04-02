import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/router";

const STORAGE_KEY = "selectedUser";
export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState(null);

  // Load user from localStorage on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    if (storedUser) setSelectedUser(JSON.parse(storedUser));
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedUser));
    }
  }, [selectedUser]);

  // Redirect to default location if not set
  useEffect(() => {
    const currentLocation = router.query.location;
    const defaultLocation = selectedUser?.permissions?.locations?.[0]?.id?.$oid;

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
