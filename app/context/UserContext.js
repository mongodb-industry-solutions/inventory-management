import React, {
  useCallback,
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

const STORAGE_KEY = "selectedUser";

export const UserContext = createContext();

export const UserProvider = ({ children, defaultLocationId }) => {
  // Define the default user with a default location
  const defaultUser = {
    name: "Eddie",
    surname: "Grant",
    title: "Inventory Manager",
    permissions: {
      locations: [
        {
          id: { $oid: defaultLocationId || "65c63cb61526ffd3415fadbd" },
          role: "inventory manager",
          name: "Bogatell Factory",
          area_code: "ES",
        },
      ],
    },
  };

  // Initialize state with default user
  const [selectedUser, setSelectedUser] = useState(() => {
    if (typeof window !== "undefined") {
      const storedUser = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return storedUser || defaultUser;
    }
    return defaultUser;
  });

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

  // Function to get the default location ID
  const getDefaultLocationId = () => {
    return (
      selectedUser.permissions?.locations?.[0]?.id?.$oid || defaultLocationId
    );
  };

  // SSE: Start watching product list
  const startWatchProductList = useCallback((setDisplayProducts, addAlert) => {
    console.log("Attempting to start EventSource for Product List...");

    const eventSource = new EventSource(
      "/api/sse?sessionId=" + +"&colName=" + collection
    );

    eventSource.onopen = () => {
      console.log("EventSource for Product List started.");
      // Save the SSE connection reference in the state
    };

    eventSource.onmessage = (event) => {
      console.log("Product list event received:", event); // Log received events for debugging
      const change = JSON.parse(event.data);

      if (change.fullDocument) {
        console.log("Change detected");
        setDisplayProducts((prevProducts) =>
          prevProducts.map((product) =>
            product._id === change.fullDocument._id
              ? change.fullDocument
              : product
          )
        );

        // Handle alerts if stock is low
        const pattern = /^items\.(\d+)\.stock/;
        for (const key of Object.keys(change.updateDescription.updatedFields)) {
          if (pattern.test(key)) {
            const updatedItemIndex = parseInt(key.match(pattern)[1], 10);
            const updatedItem = change.fullDocument.items[updatedItemIndex];
            const itemStock = updatedItem.stock.find(
              (stock) => stock.location.type !== "warehouse"
            );
            if (itemStock?.amount + itemStock?.ordered < itemStock?.threshold) {
              addAlert(updatedItem);
            }
          }
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();

      // Attempt reconnection after a delay
      setTimeout(() => {
        console.log("Attempting to reconnect SSE for product list...");
        startWatchProductList(setDisplayProducts, addAlert);
      }, 5000);
    };

    return () => {
      console.log("Closing EventSource for Product List");
      eventSource.close();
    };
  }, []);

  // SSE: Start watching product detail
  const startWatchProductDetail = (setProduct, productId, location) => {
    console.log("Attempting to start EventSource for Product Detail...");

    const eventSource = new EventSource(
      `/api/streams/productDetail?productId=${productId}&location=${
        location || ""
      }`
    );
    console.log("EventSource for Product Detail started."); // Verify if the stream started

    eventSource.onmessage = (event) => {
      console.log("Product detail event received:", event); // Log received events for debugging
      const updatedProduct = JSON.parse(event.data);
      setProduct(updatedProduct);
    };

    eventSource.onerror = (error) => {
      console.error("SSE error for product detail:", error);
      eventSource.close();

      // Attempt reconnection after a delay
      setTimeout(() => {
        console.log("Attempting to reconnect SSE for product detail...");
        startWatchProductDetail(setProduct, productId, location);
      }, 5000);
    };

    return () => {
      console.log("Closing EventSource for Product Detail");
      eventSource.close();
    };
  };

  const startWatchDashboard = (dashboard) => {
    console.log("Attempting to start EventSource for Dashboard...");
    const eventSource = new EventSource("/api/streams/dashboard");

    eventSource.onopen = () => {
      console.log("EventSource for Dashboard opened successfully.");
    };

    eventSource.onmessage = (event) => {
      console.log("Real-time data received from Dashboard stream:", event.data);
      const data = JSON.parse(event.data);

      // If relevant data is received, refresh the dashboard
      if (data) {
        console.log("Refreshing dashboard...");
        dashboard
          .refresh()
          .then(() => {
            console.log(
              "Dashboard successfully refreshed with real-time data."
            );
          })
          .catch((err) => {
            console.error(
              "Error refreshing dashboard with real-time data:",
              err
            );
          });
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error for Dashboard:", error);
      eventSource.close();

      // Attempt reconnection after a delay
      setTimeout(() => {
        console.log("Attempting to reconnect SSE for Dashboard...");
        startWatchDashboard(dashboard);
      }, 5000);
    };

    return () => {
      console.log("Closing EventSource for Dashboard");
      eventSource.close();
    };
  };

  // SSE: Start watching inventory check
  const startWatchInventoryCheck = (dashboard, addAlert) => {
    console.log("Attempting to start EventSource for Inventory Check...");
    const eventSource = new EventSource("/api/streams/inventoryCheck");
    console.log("EventSource for Inventory Check started."); // Verify initialization

    eventSource.onmessage = (event) => {
      console.log("Received new inventory check result:", event); // Log received events for debugging
      const newCheckResult = JSON.parse(event.data);
      addAlert(newCheckResult);
      dashboard.refresh();
    };

    eventSource.onerror = (error) => {
      console.error("Inventory check SSE error:", error);
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
    const eventSource = new EventSource("/api/streams/control");
    console.log("EventSource for Control started."); // Verify initialization

    eventSource.onmessage = (event) => {
      console.log("Control update received:", event); // Log received events for debugging
      const updatedProduct = JSON.parse(event.data);
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
    };

    eventSource.onerror = (error) => {
      console.error("Control SSE error:", error);
      eventSource.close();
    };

    return () => {
      console.log("Closing EventSource for Control");
      eventSource.close();
    };
  };

  return (
    <UserContext.Provider
      value={{
        selectedUser,
        setUser,
        getDefaultLocationId,
        startWatchProductList,
        startWatchProductDetail,
        startWatchDashboard,
        startWatchInventoryCheck,
        startWatchControl,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
