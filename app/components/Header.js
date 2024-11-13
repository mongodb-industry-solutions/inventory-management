'use client'
import React, { useState } from 'react';
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
  const [isOnline, setOnlineStatus] = useState(true);
  const [isLoading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const router = useRouter();
  const { location, ...otherQueryParams } = router.query;
  const { currentUser } = useUser();

  // Assuming edge type is true since it's a factory location
  const isEdgeType = true;
  
  React.useEffect(() => {
    if (currentUser?.permissions?.locations?.length > 0) {
      const locationId = currentUser.permissions.locations[0].id;
      router.push({
        pathname: router.pathname === '/' ? '/products' : router.pathname,
        query: {
          ...otherQueryParams,
          location: locationId,
        },
      });
    }
  }, [currentUser, router.pathname]);

  const fetchStatus = async (isToggle) => {
    try {
      const response = await fetch('/api/edge/getStatus');
      const status = await response.json();
      const newStatus = status.cloud_connected;

      if (isToggle) {
        if (newStatus !== isOnline) {
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
          action: isOnline ? 'disable' : 'enable',
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

  return (
    <div className={styles["layout-header"]}>
      <H2><MongoDBLogoMark height={32}/> LeafyInventory</H2>
      
      {isEdgeType && (
        <Button
          isLoading={isLoading}
          loadingIndicator={<Spinner/>}
          variant={isOnline ? 'primaryOutline' : 'dangerOutline'}
          onClick={handleConnectionToggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Button>
      )}

      <div className={styles["user-info"]} onClick={handleDropdownToggle}>
        <div>
          <div className={styles["user-name"]}>{currentUser?.name} {currentUser?.surname}</div>
          <div className={styles["user-job-title"]}>{currentUser?.title}</div>
        </div>
        {showDropdown && (
          <div className={styles['dropdown-container']}>
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