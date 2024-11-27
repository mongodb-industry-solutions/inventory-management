import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'selectedUser';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Define the default user
  const defaultUser = {
    name: "Eddie",
    surname: "Grant",
    title: "Inventory Manager",
    permissions: {
      locations: [
        {
          id: { $oid: "65c63cb61526ffd3415fadbd" },
          role: "inventory manager",
          name: "Bogatell Factory",
          area_code: "ES",
        },
      ],
    },
  };

  // Initialize state with default user
  const [selectedUser, setSelectedUser] = useState(defaultUser);

  // On component mount, check if there's a stored user
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (storedUser) {
        setSelectedUser(storedUser);
      }
    }
  }, []);

  // Save selected user to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedUser));
    }
  }, [selectedUser]);

  // Function to update the user
  const setUser = (user) => {
    setSelectedUser(user);
  };

const startWatchProductList = (setDisplayProducts, addAlert) => {
  // Create an EventSource to connect to the SSE endpoint
  const eventSource = new EventSource('/api/streams/products');

  eventSource.onmessage = (event) => {
    const change = JSON.parse(event.data);

    if (change.fullDocument) {
      // Update the product list in the frontend
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
  };

  // Return a function to stop the SSE connection
  return () => {
    eventSource.close();
  };
};


const startWatchProductDetail = (setProduct, productId, location) => {
  // Create an EventSource to connect to the SSE endpoint
  const eventSource = new EventSource(
    `/api/streams/productDetail?productId=${productId}&location=${location || ''}`
  );

  eventSource.onmessage = (event) => {
    const updatedProduct = JSON.parse(event.data);
    setProduct(updatedProduct); // Update product state in the frontend
  };

  eventSource.onerror = (error) => {
    console.error('SSE error for product detail:', error);
    eventSource.close();
  };

  // Return a function to stop the SSE connection
  return () => {
    eventSource.close();
  };
};


const startWatchDashboard = (dashboard) => {
  console.log("Start watching dashboard via SSE");

  // Create an EventSource to connect to the SSE endpoint
  const eventSource = new EventSource('/api/streams/dashboard');

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Dashboard update received:', data);

    // Trigger a refresh or update the dashboard with the new data
    dashboard.refresh(data);
  };

  eventSource.onerror = (error) => {
    console.error('Error in dashboard SSE:', error);
    eventSource.close();
  };

  // Return a function to stop the SSE connection
  return () => {
    console.log('Stopping dashboard SSE');
    eventSource.close();
  };
};


const startWatchInventoryCheck = (dashboard, addAlert) => {
  console.log('Starting inventory check SSE stream.');

  // Create an EventSource to connect to the SSE API
  const eventSource = new EventSource('/api/streams/inventoryCheck');

  eventSource.onmessage = (event) => {
    const newCheckResult = JSON.parse(event.data);

    console.log('Received new inventory check result:', newCheckResult);

    // Trigger the addAlert callback with the new result
    addAlert(newCheckResult);

    // Refresh the dashboard
    dashboard.refresh();
  };

  eventSource.onerror = (error) => {
    console.error('Inventory check SSE error:', error);
    eventSource.close();
  };

  // Return a function to stop the SSE connection
  return () => {
    console.log('Closing inventory check SSE stream.');
    eventSource.close();
  };
};


const startWatchControl = (setProducts) => {
  console.log('Starting control SSE stream.');

  // Create an EventSource to connect to the SSE API
  const eventSource = new EventSource('/api/streams/control');

  eventSource.onmessage = (event) => {
    const updatedProduct = JSON.parse(event.data);

    console.log('Received updated product:', updatedProduct);

    // Update the products state in the frontend
    setProducts((prevProducts) => {
      const updatedIndex = prevProducts.findIndex((product) => product._id === updatedProduct._id);
      if (updatedIndex !== -1) {
        const updatedProducts = [...prevProducts];
        updatedProducts[updatedIndex] = updatedProduct;
        return updatedProducts;
      } else {
        return prevProducts;
      }
    });
  };

  eventSource.onerror = (error) => {
    console.error('Control SSE error:', error);
    eventSource.close();
  };

  // Return a function to stop the SSE connection
  return () => {
    console.log('Closing control SSE stream.');
    eventSource.close();
  };
};


  const stopWatchProductList = () => {
    closeStreamProductList();
  };

  const stopWatchProductDetail = () => {
    closeStreamProductDetail();
  };

  const stopWatchDashboard = () => {
    closeStreamDashboard();
  };

  const stopWatchInventoryCheck = () => {
    closeStreamInventoryCheck();
  };

  const stopWatchControl = () => {
    closeStreamControl();
  };

  return (
    <UserContext.Provider value={{ selectedUser, 
      setUser, 
      startWatchProductList, 
      stopWatchProductList, 
      startWatchProductDetail, 
      stopWatchProductDetail,
      startWatchDashboard,
      stopWatchDashboard,
      startWatchInventoryCheck,
      stopWatchInventoryCheck,
      startWatchControl,
      stopWatchControl
    }}>
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