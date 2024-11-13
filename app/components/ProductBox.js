'use client'

import React, { useState, useEffect, useContext } from 'react';
import { useUser } from '../context/UserContext';
import { useRouter } from 'next/router';
import { ServerContext } from '../pages/_app';
import { FaStore, FaIndustry } from "react-icons/fa";
import styles from '../styles/navbar.module.css';

function Navbar() {
  // State to manage whether the dropdown is open or closed
  const [isOpen, setIsOpen] = useState(false);
  // State to track the currently selected dropdown option
  const [selectedOption, setSelectedOption] = useState('');
  // State to track the currently selected location ID
  const [selectedLocationId, setSelectedLocationId] = useState('');

  const { selectedUser } = useUser(); // Context to access the currently selected user
  const utils = useContext(ServerContext); // Context to access server-related information

  const router = useRouter(); // Next.js router for navigation

  // Toggle the visibility of the dropdown menu
  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
  };

  // Handle option click within the dropdown menu
  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setIsOpen(false); // Close the dropdown after selecting an option
  };

  // Info pop-up state management
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  // Handle the button click to show the information pop-up
  const handleInfoButtonClick = () => {
    setShowInfoPopup(true);
  };

  // Handle closing the information pop-up
  const handlePopupClose = () => {
    setShowInfoPopup(false);
  };

  /* Select the default location when the selected user changes */
  useEffect(() => {
    // Set the default selected location based on user's permissions
    setSelectedOption(selectedUser?.permissions?.locations?.[0]?.name);
    setSelectedLocationId(selectedUser?.permissions?.locations?.[0]?.id);
  }, [selectedUser]);

  return (
    <div className={`${styles["layout-navbar"]} ${selectedLocationId ? styles["branch"] : styles["hq"]}`}>
      <div className={styles["dropdown"]}>
        {/* Display an icon depending on the industry type */}
        {utils.demoInfo.industry == 'manufacturing' ? 
          <FaIndustry /> :
          <FaStore />}
        {/* Dropdown toggle button to select location */}
        <button className={styles["dropdown-toggle"]} onClick={handleDropdownToggle}>
          {selectedOption || 'Barcelona Area' }
          <span className={styles["dropdown-arrow"]}></span>
        </button>
        {/* Render the dropdown menu if it is open */}
        {isOpen && (
          <div className={styles["dropdown-menu"]}>
            {selectedUser?.permissions?.locations.map((location) => (
              <a key={location.id} href="#" onClick={() => handleOptionClick(location.name)}>
                {location.name}
              </a>
            ))}
          </div>
        )}

        {/* Navigation buttons to different parts of the application */}
        <div className={styles["mongodb-button-container"]}>
          {/* Link to Real-time Inventory page */}
          <a href={selectedLocationId ? `/products?location=${selectedLocationId}` : "/products"}>
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === '/products' ? styles["bold-text"] : ''
              }`}
            >
              Real-time Inventory
            </button>
          </a>
          {/* Link to Orders (Inbound Transactions) page */}
          <a href={selectedLocationId ? `/transactions?type=inbound&location=${selectedLocationId}` : "/transactions?type=inbound"}>
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === '/transactions' && router.query.type === 'inbound' ? styles["bold-text"] : ''
              }`}
            >
              Orders
            </button>
          </a>
          {/* Link to Sales/Dispatch Events (Outbound Transactions) page */}
          <a href={selectedLocationId ? `/transactions?type=outbound&location=${selectedLocationId}` : "/transactions?type=outbound"}>
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === '/transactions' && router.query.type === 'outbound' ? styles["bold-text"] : ''
              }`}
            >
              {utils.demoInfo.industry == 'manufacturing' ? 
                <>Dispatch Events</> :
                <>Sales Events</>}
            </button>
          </a>
          {/* Link to Analytics (Dashboard) page */}
          <a href={selectedLocationId ? `/dashboard?location=${selectedLocationId}` : "/dashboard"}>
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === '/dashboard' ? styles["bold-text"] : ''
              }`}
            >
              Analytics
            </button>
          </a>
        </div>

        {/* Button to open the information pop-up */}
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

      {/* Render the information pop-up if it is open */}
      {showInfoPopup && (
        <div onClick={handlePopupClose}>
          <div className={styles["architecture-container"]}>
            <img src="/images/inv_architecture.png" alt="Architecture" className={styles["architecture-img"]} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;

/*
Changes made:
1. Removed all references to "edge" and treated the server as a primary one.
2. Removed any logic distinguishing between server types.
3. Updated query parameters and relevant URLs to remove `edge` parameter.
4. Added inline comments to explain the more complex parts of the code.
*/
