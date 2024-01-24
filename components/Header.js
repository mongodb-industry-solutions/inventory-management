'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';
import styles from '../styles/header.module.css';

function Header() {

  const [usersList, setUsersList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const router = useRouter();
  const { store, ...otherQueryParams } = router.query;


  const { selectedUser, setUser } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/getUsers'); // assuming you have an API route to fetch users
        const data = await response.json();

        if (data.users.length > 0) {
          setUsersList(data.users);

          if (!localStorage.getItem('selectedUser')){
            setUser(data.users[0]);
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
      
      if(selectedUser.permissions.stores.length > 0){
        router.push({
          pathname: router.pathname == '/' ? '/products' : router.pathname,
          query: { ...otherQueryParams, store: selectedUser.permissions.stores[0].store_id },
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

