// File: context/UserContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'selectedUser';
export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch the selected user from local storage on component mount
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (storedUser && !selectedUser) {
      setSelectedUser(storedUser);
    }
    fetchUsers(); // Fetch users on initial mount
  }, []);

  const setUser = (user) => {
    setSelectedUser(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  };

  // Fetch users from the API
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/getUsers');
      const data = await response.json();
      if (data.documents) {
        setUser(data.documents[0]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startProductListStream = (setDisplayProducts, addAlert) => {
    const eventSource = new EventSource(`/api/streams/productList?locationId=${selectedUser.location.id}`);
    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "update") {
        const updatedProduct = message.product;
        setDisplayProducts((prevProducts) =>
          prevProducts.map((product) =>
            product._id === updatedProduct._id ? updatedProduct : product
          )
        );
      } else if (message.type === "alert") {
        addAlert(message.item);
      }
    };
    return () => eventSource.close();
  };

  const startProductDetailStream = (productId, setProduct) => {
    const eventSource = new EventSource(`/api/streams/productDetail?productId=${productId}`);
    eventSource.onmessage = (event) => {
      setProduct(JSON.parse(event.data));
    };
    return () => eventSource.close();
  };

  const startDashboardStream = (refreshDashboard) => {
    const eventSource = new EventSource('/api/streams/dashboard');
    eventSource.onmessage = () => refreshDashboard();
    return () => eventSource.close();
  };


  const startControlStream = (setProducts) => {
    const eventSource = new EventSource('/api/streams/control');
    eventSource.onmessage = (event) => {
      const updatedProduct = JSON.parse(event.data);
      setProducts((prevProducts) => {
        const updatedIndex = prevProducts.findIndex((product) => product._id === updatedProduct._id);
        if (updatedIndex !== -1) {
          const newProducts = [...prevProducts];
          newProducts[updatedIndex] = updatedProduct;
          return newProducts;
        }
        return prevProducts;
      });
    };
    return () => eventSource.close();
  };

  return (
    <UserContext.Provider
      value={{
        selectedUser,
        setUser,
        startProductListStream,
        startProductDetailStream,
        startDashboardStream,
        startControlStream
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
