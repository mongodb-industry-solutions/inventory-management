import React, { createContext } from 'react';
import '../styles/layout.css';
import "../styles/global.css";
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import { UserProvider } from '../context/UserContext';

export const ServerContext = createContext();

function MyApp({ Component, pageProps, utils }) {
    return (
    <ServerContext.Provider value={utils}>
     <UserProvider>
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

MyApp.getInitialProps = async ({ ctx }) => {
  try {
    const requiredEnvVariables = [
      'APP_SERVICES_URI',
      'API_KEY',
      'REALM_APP_ID',
      'EDGE_SERVER_HOST'
    ];
    
    requiredEnvVariables.forEach((envVar) => {
      if (!process.env[envVar]) {
        throw new Error(`Invalid/Missing environment variables: "${envVar}"`);
      }
    });

    const uri = process.env.APP_SERVICES_URI;
    const key = process.env.API_KEY;
    const appId = process.env.REALM_APP_ID;
    const edgeHost = process.env.EDGE_SERVER_HOST;

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

    return { utils: {apiInfo: { dataUri, httpsUri, accessToken}, edgeInfo: { edgeHost }}};
  } catch (e) {
    console.error(e);
    return {
      props: { utils: {apiInfo: { dataUri: null, httpsUri: null, accessToken: null}, edgeInfo: { edgeHost: null }}},
    };
  }
}