import React, { createContext } from 'react';
import '../styles/layout.css';
import "../styles/global.css";
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { UserProvider } from '../context/UserContext';

export const AppServiceContext = createContext();

function MyApp({ Component, pageProps, apiInfo }) {
    return (
    <AppServiceContext.Provider value={apiInfo}>
     <UserProvider>
      <div className="layout">
        <div className="header-container">
          <Header />
          <Navbar />
        </div>
          <Component {...pageProps} />
       </div>
      </UserProvider>
      </AppServiceContext.Provider>
    );
}

export default MyApp;

MyApp.getInitialProps = async ({ ctx }) => {
  try {
    if (!process.env.APP_SERVICES_URI) {
      throw new Error('Invalid/Missing environment variables: "APP_SERVICES_URI"')
    }
    if (!process.env.API_KEY) {
      throw new Error('Invalid/Missing environment variables: "API_KEY"')
    }
    if (!process.env.REALM_APP_ID) {
      throw new Error('Invalid/Missing environment variables: "REALM_APP_ID"')
    }

    const uri = process.env.APP_SERVICES_URI;
    const key = process.env.API_KEY;
    const appId = process.env.REALM_APP_ID;

    const regex = /^https:\/\/([^/]+)\.data\.mongodb-api\.com/;
    const match = uri.match(regex);
    const region = match ? match[1] + "." : null;

    const tokenResponse = await fetch(`https://${region}services.cloud.mongodb.com/api/client/v2.0/app/${appId}/auth/providers/api-key/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: key,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData?.access_token;
    const dataUri = uri + '/app/' + appId + '/endpoint/data/v1';
    const httpsUri = uri + '/app/' + appId + '/endpoint/';

    return { apiInfo: { dataUri, httpsUri, accessToken } };
  } catch (e) {
    console.error(e);
    return {
      props: { apiInfo: { uri: null, key: null } },
    };
  }
}