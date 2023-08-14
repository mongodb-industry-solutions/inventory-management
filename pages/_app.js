import React from 'react';

import '../styles/layout.css';
import "../styles/global.css";

import Header from '../components/Header';
import Navbar from '../components/Navbar';

function MyApp({ Component, pageProps }) {
    return (
     <>
      <div className="layout">
        <div className="header-container">
          <Header />
          <Navbar />
        </div>
          <Component {...pageProps} />
       </div>
      </>
    );
}

export default MyApp;