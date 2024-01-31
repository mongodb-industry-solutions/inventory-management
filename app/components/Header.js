'use client'
import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';
import { AppServiceContext } from '../pages/_app';
import styles from '../styles/header.module.css';

function Header( ) {

  const [usersList, setUsersList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState(true);

  const router = useRouter();
  const { store, ...otherQueryParams } = router.query;

  const apiInfo = useContext(AppServiceContext);

  const { selectedUser, setUser } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(apiInfo.dataUri + '/action/find', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + apiInfo.accessToken,
          },
          body: JSON.stringify({
            dataSource: 'mongodb-atlas',
            database: 'inventory_management_demo',
            collection: 'users',
            filter: {},
          }),
        });
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
    // Update store query param on user change
    if(selectedUser){
      
      //Display online status if edge
      if(selectedUser.type == 'edge'){
        
        const fetchData = async () => {
          try {
            
            const response = await fetch('http://localhost:80/api/client/v2.0/tiered-sync/status');
            const status = await response.json();
            setOnlineStatus(status.cloud_connected);
            console.log(status);
          } catch (error) {
            console.log("B");
            console.error('Error fetching data:', error);
            setOnlineStatus(false);
          }
        };
    
        fetchData();
      }

      //Set path
      if(selectedUser.permissions.stores.length > 0){
        router.push({
          pathname: router.pathname == '/' ? '/products' : router.pathname,
          query: { ...otherQueryParams, store: selectedUser.permissions.stores[0].id },
        });
      } else {
        router.push({
          pathname: router.pathname == '/' ? '/products' : router.pathname,
          query: { ...otherQueryParams},
        });
      }
    }

  }, [selectedUser]);

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleUserSelection = (selectedUser) => {
    setUser(selectedUser);
    setShowDropdown(false);
  };


  return (
    <div className={styles["layout-header"]}>
      <a href="/products"><img src="/images/logo_v1.png" alt="Logo" className={styles["logo"]}/></a>
      {selectedUser?.type == 'edge' ? 
        onlineStatus ? (<div className={styles["online-tag"]}>ONLINE</div>)
        : (<div className={styles["offline-tag"]}>OFFLINE</div>)
        : null
      }
      <div className={styles["user-info"]} onClick={handleDropdownToggle}>
        <img src="/images/userAvatar.png" alt="User Avatar" className={styles["user-avatar"]} />
        <div>
            <div className={styles["user-name"]}>{selectedUser?.name} {selectedUser?.surname}</div>
            <div className={styles["user-job-title"]}>{selectedUser?.title}</div>
        </div>
        {showDropdown && (
          <div className={styles['dropdown-container']}>
            <ul className={styles['user-list']}>
              {usersList.map((user) => (
                <li key={user._id} onClick={() => handleUserSelection(user)}>
                  {user.name} {user.surname}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default Header;

