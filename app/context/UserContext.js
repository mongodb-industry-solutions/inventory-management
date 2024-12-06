import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const STORAGE_KEY = 'selectedUser';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const router = useRouter(); // Use Next.js router for navigation and query handling
  const [selectedUser, setSelectedUser] = useState(null); // State for the selected user
  const [loading, setLoading] = useState(true); // Loading state for initial fetch

  // Fetch user from the backend or localStorage
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Check if user is stored in localStorage
        const storedUser = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (storedUser) {
          setSelectedUser(storedUser);
          setLoading(false);
          return;
        }

        // Fetch the user from the database (via API)
        const response = await fetch('/api/getUsers');
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        const user = await response.json();
        setSelectedUser(user);

        // Save the fetched user to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user:', error);
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Save selected user to localStorage whenever it changes
  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedUser));
    }
  }, [selectedUser]);

  // Redirect to a URL with default location if missing
  useEffect(() => {
    const currentLocation = router.query.location;
    const defaultLocation = selectedUser?.permissions?.locations?.[0]?.id?.$oid;

    if (!currentLocation && defaultLocation) {
      const updatedQuery = {
        ...router.query,
        location: defaultLocation,
        edge: router.query.edge || 'false', // Preserve `edge` value or set default
      };

      // Update the URL without reloading the page
      router.replace({ pathname: router.pathname, query: updatedQuery });
    }
  }, [router, selectedUser]);

  // Function to update the user
  const setUser = (user) => {
    setSelectedUser(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  };

  // Function to get the default location ID
  const getDefaultLocationId = () => {
    return selectedUser?.permissions?.locations?.[0]?.id?.$oid || null;
  };

  // SSE: Start watching product list
  const startWatchProductList = (setDisplayProducts, addAlert) => {
    console.log('Attempting to start EventSource for Product List...');

    const eventSource = new EventSource('/api/streams/products');
    console.log('EventSource for Product List started.');

    eventSource.onmessage = (event) => {
      const change = JSON.parse(event.data);

      if (change.fullDocument) {
        setDisplayProducts((prevProducts) =>
          prevProducts.map((product) =>
            product._id === change.fullDocument._id ? change.fullDocument : product
          )
        );

        // Handle alerts if stock is low
        const pattern = /^items\.(\d+)\.stock/;
        for (const key of Object.keys(change.updateDescription.updatedFields)) {
          if (pattern.test(key)) {
            const updatedItemIndex = parseInt(key.match(pattern)[1], 10);
            const updatedItem = change.fullDocument.items[updatedItemIndex];
            const itemStock = updatedItem.stock.find((stock) => stock.location.type !== 'warehouse');
            if (itemStock?.amount + itemStock?.ordered < itemStock?.threshold) {
              addAlert(updatedItem);
            }
          }
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();

      // Attempt reconnection after a delay
      setTimeout(() => {
        console.log('Reconnecting SSE for Product List...');
        startWatchProductList(setDisplayProducts, addAlert);
      }, 5000);
    };

    return () => {
      console.log('Closing EventSource for Product List');
      eventSource.close();
    };
  };

  // SSE: Start watching product detail
  const startWatchProductDetail = (setProduct, productId, location) => {
    console.log('Attempting to start EventSource for Product Detail...');

    const eventSource = new EventSource(
      `/api/streams/productDetail?productId=${productId}&location=${location || ''}`
    );

    eventSource.onmessage = (event) => {
      const updatedProduct = JSON.parse(event.data);
      setProduct(updatedProduct);
    };

    eventSource.onerror = (error) => {
      console.error('SSE error for Product Detail:', error);
      eventSource.close();

      // Attempt reconnection
      setTimeout(() => {
        startWatchProductDetail(setProduct, productId, location);
      }, 5000);
    };

    return () => {
      eventSource.close();
    };
  };

  // SSE: Start watching dashboard
  const startWatchDashboard = (dashboard) => {
    const eventSource = new EventSource('/api/streams/dashboard');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data) {
        dashboard.refresh();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error for Dashboard:', error);
      eventSource.close();

      // Attempt reconnection
      setTimeout(() => {
        startWatchDashboard(dashboard);
      }, 5000);
    };

    return () => {
      eventSource.close();
    };
  };

   // SSE: Start watching inventory check
   const startWatchInventoryCheck = (dashboard, addAlert) => {
    console.log("Attempting to start EventSource for Inventory Check...");
    const eventSource = new EventSource('/api/streams/inventoryCheck');
    console.log("EventSource for Inventory Check started.");  // Verify initialization

    eventSource.onmessage = (event) => {
      console.log('Received new inventory check result:', event); // Log received events for debugging
      const newCheckResult = JSON.parse(event.data);
      addAlert(newCheckResult);
      dashboard.refresh();
    };

    eventSource.onerror = (error) => {
      console.error('Inventory check SSE error:', error);
      eventSource.close();
    };

    return () => {
      console.log("Closing EventSource for Inventory Check");
      eventSource.close();
    };
  };
  
    // SSE: Start watching control
    const startWatchControl = (setProducts) => {
      console.log("Attempting to start EventSource for Control...");
      const eventSource = new EventSource('/api/streams/control');
      console.log("EventSource for Control started.");  // Verify initialization
  
      eventSource.onmessage = (event) => {
        console.log('Control update received:', event); // Log received events for debugging
        const updatedProduct = JSON.parse(event.data);
        setProducts((prevProducts) => {
          const updatedIndex = prevProducts.findIndex((product) => product._id === updatedProduct._id);
          if (updatedIndex !== -1) {
            const updatedProducts = [...prevProducts];
            updatedProducts[updatedIndex] = updatedProduct;
            return updatedProducts;
          }
          return prevProducts;
        });
      };
  
      eventSource.onerror = (error) => {
        console.error('Control SSE error:', error);
        eventSource.close();
      };
  
      return () => {
        console.log("Closing EventSource for Control");
        eventSource.close();
      };
    };
  

  // Prevent app from rendering prematurely
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <UserContext.Provider
      value={{
        selectedUser,
        setUser,
        getDefaultLocationId,
        startWatchProductList,
        startWatchProductDetail,
        startWatchDashboard,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
