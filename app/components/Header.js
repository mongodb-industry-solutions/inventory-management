'use client'
import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';
import { ServerContext } from '../pages/_app';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { MongoDBLogoMark } from '@leafygreen-ui/logo';
import Icon from "@leafygreen-ui/icon";
import IconButton from "@leafygreen-ui/icon-button";
import { H2 } from '@leafygreen-ui/typography';
import Button from "@leafygreen-ui/button";
import styles from '../styles/header.module.css';

function Header( ) {

  const [usersList, setUsersList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isOnline, setOnlineStatus] = useState();
  const [isLoading, setLoading] = useState(false);

  const router = useRouter();
  const { location, edge, ...otherQueryParams } = router.query;

  const utils = useContext(ServerContext);

  const { selectedUser, setUser } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        let response;
        if (edge === 'true') {
          response = await fetch('/api/edge/getUsers');
        } else {
          response = await fetch(utils.apiInfo.dataUri + '/action/find', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Bearer ' + utils.apiInfo.accessToken,
            },
            body: JSON.stringify({
              dataSource: 'mongodb-atlas',
              database: utils.dbInfo.dbName,
              collection: 'users',
              filter: {},
            }),
          });
        }
        
        const data = await response.json();

        if (data.documents) {
          setUsersList(data.documents);

          if (!localStorage.getItem('selectedUser')){
            setUser(data.documents[0]);
          } 
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchData();
  }, [ ]);

  useEffect(() => {
    // Update location query param on user change
    if(selectedUser){
      if(selectedUser.type == 'edge'){
        fetchStatus(false);
      }
      //Set path
      if(selectedUser.permissions.locations?.length > 0){
        router.push({
          pathname: router.pathname == '/' ? '/products' : router.pathname,
          query: { 
            ...otherQueryParams, 
            location: selectedUser.permissions.locations[0]?.id,
            edge: selectedUser.type === 'edge',
          },
        });
      } else {
        router.push({
          pathname: router.pathname == '/' ? '/products' : router.pathname,
          query: { 
            ...otherQueryParams,
            edge: selectedUser.type === 'edge',
          },
        });
      }
    }

  }, [selectedUser]);

  const fetchStatus = async (isToggle) => {
    try {
      const response = await fetch('/api/edge/getStatus');
      const status = await response.json();
      const newStatus = status.cloud_connected;

      if(isToggle){
        if(newStatus !== isOnline){
          setOnlineStatus(newStatus);
          setLoading(false);
        } else {
          setTimeout(() => {
            fetchStatus(true);
          }, 1000);
        }
      } else {
        setOnlineStatus(newStatus);
      }

    } catch (error) {
      console.error('Error fetching status:', error);
      setLoading(false);
    }
  };

  const handleConnectionToggle = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/edge/setConnection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isOnline ? 'disable' : 'enable', // Toggle the connection status
        }),
      });
  
      if (!response.ok) {
        console.error('Failed to change connection status');
        return;
      }
      
      fetchStatus(true);

    } catch (error) {
      console.error('Error toggling connection status:', error);
      setLoading(false);
    }
  };

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleUserSelection = (selectedUser) => {
    setUser(selectedUser);
    setShowDropdown(false);
  };


  return (
    <div className={styles["layout-header"]}>
        <H2><MongoDBLogoMark height={32}/> LeafyInventory</H2>
      {selectedUser?.type == 'edge' ? 
        <Button
            isLoading={isLoading}
            loadingIndicator={<Spinner/>}
            variant={isOnline ? 'primaryOutline' : 'dangerOutline'}
            onClick={handleConnectionToggle}
            children={isOnline ? 'ONLINE' : 'OFFLINE'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
        />
        : null
      }
      <div className={styles["user-info"]} onClick={handleDropdownToggle}>
        { selectedUser ? <img src={`/images/${selectedUser?._id}.png`} alt="User Avatar" className={styles["user-avatar"]} /> : null}
        <div>
            <div className={styles["user-name"]}>{selectedUser?.name} {selectedUser?.surname}</div>
            <div className={styles["user-job-title"]}>{selectedUser?.title}</div>
        </div>
        {showDropdown && (
          <div className={styles['dropdown-container']}>
            <ul className={styles['user-list']}>
              {usersList.filter((user) => user._id !== selectedUser?._id).map((user) => (
                <li key={user._id} onClick={() => handleUserSelection(user)}>
                  <img src={`/images/${user._id}.png`} alt="User Avatar" className={styles["user-avatar"]} />
                  <div>
                      <div className={styles["user-name"]}>{user?.name} {user?.surname}</div>
                      <div className={styles["user-job-title"]}>{user?.title}</div>
                  </div>
                </li>
              ))}
            </ul>
            <IconButton
              aria-label='Control Panel'
              href='/control'
            >
              <Icon glyph="Settings" />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
}

export default Header;

