'use client'
import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';
import { ServerContext } from '../pages/_app';
import { MongoDBLogoMark } from '@leafygreen-ui/logo';
import Icon from "@leafygreen-ui/icon";
import IconButton from "@leafygreen-ui/icon-button";
import { H2 } from '@leafygreen-ui/typography';
import Button from "@leafygreen-ui/button";
import styles from '../styles/header.module.css';
import dynamic from 'next/dynamic';

const Spinner = dynamic(() => import('@leafygreen-ui/loading-indicator'), { ssr: false });

function Header() {
  const [usersList, setUsersList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isOnline, setOnlineStatus] = useState();
  const [isLoading, setLoading] = useState(false);

  const router = useRouter();
  const { location, ...otherQueryParams } = router.query;

  const utils = useContext(ServerContext);

  const { selectedUser, setUser } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/getUsers', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        const data = await response.json();

        if (data.documents) {
          setUsersList(data.documents);

          if (!localStorage.getItem('selectedUser')) {
            setUser(data.documents[0]);
          } 
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Update location query param on user change
    if(selectedUser){
      //Set path
      if(selectedUser.permissions.locations?.length > 0){
        router.push({
          pathname: router.pathname == '/' ? '/products' : router.pathname,
          query: { 
            ...otherQueryParams, 
            location: selectedUser.permissions.locations[0]?.id,
          },
        });
      } else {
        router.push({
          pathname: router.pathname == '/' ? '/products' : router.pathname,
          query: { 
            ...otherQueryParams,
          },
        });
      }
    }
  }, [selectedUser]);

  const fetchStatus = async (isToggle) => {
    try {
      const response = await fetch('/api/getStatus');
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
      const response = await fetch('/api/setConnection', {
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
      {selectedUser ? 
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
              href={`/control?${new URLSearchParams(router.query).toString()}`}
              target="_blank"
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

/*
Changes made:
1. Removed all references to "edge" and treated the server as a primary one.
2. Removed any logic distinguishing between server types.
3. Updated API endpoints from `/api/secondary/*` to `/api/*`.
4. Removed `serverType` query parameter and relevant conditionals.
5. Fixed incorrect `dynamic` import by replacing `dynamic from 'next/dynamic';` with `import dynamic from 'next/dynamic';`.
*/
