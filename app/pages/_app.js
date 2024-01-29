import React from 'react';

import '../styles/layout.css';
import "../styles/global.css";

import Header from '../components/Header';
import Navbar from '../components/Navbar';

import { UserProvider } from '../context/UserContext';

function MyApp({ Component, pageProps }) {
    return (
     <UserProvider>
      <div className="layout">
        <div className="header-container">
          <Header />
          <Navbar />
        </div>
          <Component {...pageProps} />
       </div>
      </UserProvider>
    );
}

export default MyApp;