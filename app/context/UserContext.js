import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/router';

const STORAGE_KEY = 'selectedUser';
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
    const defaultLocation =
      selectedUser?.permissions?.locations?.[0]?.id?.$oid;

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

  // Start watching control updates
  const startWatchControl = (setProducts) => {
    const path = `/api/sse?sessionId=control&colName=control`;

    return startSSE(
      path,
      (updatedProduct) => {
        setProducts((prevProducts) => {
          const updatedIndex = prevProducts.findIndex(
            (product) => product._id === updatedProduct._id
          );
          if (updatedIndex !== -1) {
            const updatedProducts = [...prevProducts];
            updatedProducts[updatedIndex] = updatedProduct;
            return updatedProducts;
          }
          return prevProducts;
        });
      },
      () => {
        console.log('Attempting to reconnect SSE for control...');
        startWatchControl(setProducts);
      }
    );
  };

  return (
    <UserContext.Provider
      value={{
        selectedUser,
        setSelectedUser,
        startWatchControl,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context)
    throw new Error('useUser must be used within a UserProvider');
  return context;
};
