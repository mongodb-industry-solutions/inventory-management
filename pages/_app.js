import React from 'react';
import '../styles/layout.css';
import Header from '../components/Header';
import Footer from '../components/Footer';


function MyApp({ Component, pageProps }) {
    return (
       <>
        <Header />
        <Footer />
        <div className="container">
        
          <Component {...pageProps} />
        
      </div>
        
       </>
    );
}

export default MyApp;