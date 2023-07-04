import React from 'react';
import '../styles/layout.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';

function MyApp({ Component, pageProps }) {
    return (
       <>
        <Header />
        <Footer />
        <div className="container">
        <Sidebar />
        <div className="content">
          <Component {...pageProps} />
        </div>
      </div>
        
       </>
    );
}

export default MyApp;