import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'selectedUser';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    // Load the selected user from local storage on component mount
    const storedUser = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (storedUser) {
      setSelectedUser(storedUser);
    }
  }, []);
  
  const setUser = (user) => {
    setSelectedUser(user);
    // Save the selected user to local storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  };

  return (
    <UserContext.Provider value={{ selectedUser, setUser }}>
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
