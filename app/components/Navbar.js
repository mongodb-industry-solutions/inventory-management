'use client'

import React, { useState, useContext } from 'react';
import { useUser } from '../context/UserContext';
import { useRouter } from 'next/router';
import { ServerContext } from '../pages/_app';
import { FaIndustry } from "react-icons/fa";
import styles from '../styles/navbar.module.css';

function Navbar() {
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const { currentUser } = useUser();
  const utils = useContext(ServerContext);
  const router = useRouter();
  const { type } = router.query;

  const locationId = currentUser?.permissions?.locations?.[0]?.id;
  const locationName = currentUser?.permissions?.locations?.[0]?.name;

  const handleInfoButtonClick = () => {
    setShowInfoPopup(true);
  };

  const handlePopupClose = () => {
    setShowInfoPopup(false);
  };

  return (
    <div className={`${styles["layout-navbar"]} ${styles["branch"]}`}>
      <div className={styles["dropdown"]}>
        <FaIndustry />
        <button className={styles["dropdown-toggle"]}>
          {locationName}
        </button>

        <div className={styles["mongodb-button-container"]}>
          <a href={`/products?location=${locationId}`}>
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === '/products' ? styles["bold-text"] : ''
              }`}
            >
              Real-time Inventory
            </button>
          </a>
          
          <a href={`/transactions?type=inbound&location=${locationId}`}>
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === '/transactions' && type === 'inbound' ? styles["bold-text"] : ''
              }`}
            >
              Orders
            </button>
          </a>
          
          <a href={`/transactions?type=outbound&location=${locationId}`}>
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === '/transactions' && type === 'outbound' ? styles["bold-text"] : ''
              }`}
            >
              {utils.demoInfo.industry === 'manufacturing' ? 'Dispatch Events' : 'Sales Events'}
            </button>
          </a>
          
          <a href={`/dashboard?location=${locationId}`}>
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === '/dashboard' ? styles["bold-text"] : ''
              }`}
            >
              Analytics
            </button>
          </a>
        </div>

        <div className="flex justify-center items-center mb-4 mt-0">
          <button
            type="button"
            onClick={handleInfoButtonClick}
            className={styles["info-button"]}
          >
            <img src="/images/info.png" alt="Info" className={styles["info-icon"]} />
          </button>
        </div>
      </div>

      {showInfoPopup && (
        <div onClick={handlePopupClose}>
          <div className={styles["architecture-container"]}>
            <img 
              src="/images/inv_architecture.png" 
              alt="Architecture" 
              className={styles["architecture-img"]} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;