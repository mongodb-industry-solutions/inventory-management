'use client'

import React, { useState, useEffect, useContext } from 'react';
import { useUser } from '../context/UserContext';
import { useRouter } from 'next/router';
import { ServerContext } from '../pages/_app';
import { FaStore, FaIndustry } from "react-icons/fa";
import styles from '../styles/navbar.module.css';

function Navbar() {

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');

  const { selectedUser } = useUser();
  const utils = useContext(ServerContext);

  const router = useRouter();
  const { type } = router.query;

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setIsOpen(false);
  };

  //Info pop-up
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  const handleInfoButtonClick = () => {
    setShowInfoPopup(true);
  };

  const handlePopupClose = () => {
    setShowInfoPopup(false);
  };

  /* Select default location */
  useEffect(() => {
    setSelectedOption(selectedUser?.permissions?.locations[0]?.name);
    setSelectedLocationId(selectedUser?.permissions?.locations[0]?.id);
  }, [selectedUser]);

  return (
    <div className={styles["layout-navbar"]}>
      <div className={styles["dropdown"]}>
        {utils.demoInfo.industry == 'manufacturing' ? 
          <FaIndustry /> :
          <FaStore />}
        <button className={styles["dropdown-toggle"]} onClick={handleDropdownToggle}>
          {selectedOption || 'Choose your location'}
          <span className={styles["dropdown-arrow"]}></span>
        </button>
        {isOpen && (
          <div className={styles["dropdown-menu"]}>
            {selectedUser?.permissions?.locations.map((location) => (
              <a key={location.id} href="#" onClick={() => handleOptionClick(location.name)}>
                {location.name}
              </a>
            ))}
          </div>
        )}

<div className={styles["mongodb-button-container"]}>
  <a href={selectedLocationId ? `/products?location=${selectedLocationId}&edge=${selectedUser.type === 'edge'}` : "/products"}>
    <button
      className={`${styles["mongodb-button"]} ${
        router.pathname === '/products' ? styles["bold-text"] : ''
      }`}
    >
      Real-time Inventory
    </button>
  </a>
  <a href={selectedLocationId ? `/transactions?type=inbound&location=${selectedLocationId}&edge=${selectedUser.type === 'edge'}` : "/transactions?type=inbound"}>
    <button
      className={`${styles["mongodb-button"]} ${
        router.pathname === '/transactions' && type === 'inbound' ? styles["bold-text"] : ''
      }`}
    >
      Orders
    </button>
  </a>
  <a href={selectedLocationId ? `/transactions?type=outbound&location=${selectedLocationId}&edge=${selectedUser.type === 'edge'}` : "/transactions?type=outbound"}>
    <button
      className={`${styles["mongodb-button"]} ${
        router.pathname === '/transactions' && type === 'outbound' ? styles["bold-text"] : ''
      }`}
    >
       {utils.demoInfo.industry == 'manufacturing' ? 
          <>Dispatch Events</> :
          <>Sales Events</>}
    </button>
  </a>
  <a href={selectedLocationId ? `/dashboard?location=${selectedLocationId}&edge=${selectedUser.type === 'edge'}` : "/dashboard"}>
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
        <div

          onClick={handlePopupClose}
        >
          <div className={styles["architecture-container"]}>
            <img src="/images/inv_architecture.png" alt="Architecture" className={styles["architecture-img"]} />
          </div>
        </div>
      )}

    </div>
  );
}

export default Navbar;
