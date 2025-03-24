import React, { createContext, useEffect, useState } from "react";
import "../styles/layout.css";
import "../styles/global.css";
import Header from "../components/Header";
import Navbar from "../components/Navbar";
import { UserProvider } from "../context/UserContext";
import { Toaster } from "react-hot-toast";

export const ServerContext = createContext();

function MyApp({ Component, pageProps }) {
  const [utils, setUtils] = useState(null);

  // Fetch configuration from the API
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/config");
        const data = await response.json();
        setUtils(data); // Set the configuration data in state
      } catch (error) {
        console.error("Error fetching config:", error);
      }
    };

    fetchConfig();
  }, []);

  // Render a loading screen until utils is fetched
  if (!utils) {
    return <div>Loading...</div>;
  }

  return (
    <ServerContext.Provider value={utils}>
      <UserProvider>
        <Toaster />
        <div className="layout">
          <div className="header-container">
            <Header />
            <Navbar />
          </div>
          <Component {...pageProps} />
        </div>
      </UserProvider>
    </ServerContext.Provider>
  );
}

export default MyApp;
