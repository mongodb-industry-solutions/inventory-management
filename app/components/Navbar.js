'use client'

import React, { useState, useEffect, useContext } from 'react';
import { useUser } from '../context/UserContext';
import { ServerContext } from '../pages/_app';
import { FaStore, FaIndustry } from "react-icons/fa";
import styles from '../styles/navbar.module.css';

function Navbar() {

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [currentPage, setCurrentPage] = useState('');

  const { selectedUser } = useUser();
  const utils = useContext(ServerContext);

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setIsOpen(false);
  };

  const handleProductsClick = () => {
    setCurrentPage('products');
  };

  const handleOrderHistoryClick = () => {
    setCurrentPage('orderHistory');
  };

  //Info pop-up
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  const handleInfoButtonClick = () => {
    setShowInfoPopup(true);
  };

  const handlePopupClose = () => {
    setShowInfoPopup(false);
  };

  /* Select default store */
  useEffect(() => {
    setSelectedOption(selectedUser?.permissions?.locations[0]?.name);
    setSelectedStoreId(selectedUser?.permissions?.locations[0]?.id);
  }, [selectedUser]);

  /* Navigation bold when on page */
  useEffect(() => {
    setCurrentPage(window.location.pathname.slice(1));
  }
  , [currentPage]);

  return (
    <div className={styles["layout-navbar"]}>
      <div className={styles["dropdown"]}>
        {utils.demoInfo.industry == 'manufacturing' ? 
          <FaIndustry /> :
          <FaStore />}
        <button className={styles["dropdown-toggle"]} onClick={handleDropdownToggle}>
          {selectedOption || 'Choose your store'}
          <span className={styles["dropdown-arrow"]}></span>
        </button>
        {isOpen && (
          <div className={styles["dropdown-menu"]}>
            {selectedUser?.permissions?.locations.map((store) => (
              <a key={store.id} href="#" onClick={() => handleOptionClick(store.name)}>
                {store.name}
              </a>
            ))}
          </div>
        )}

<div className={styles["mongodb-button-container"]}>
  <a href={selectedStoreId ? `/products?store=${selectedStoreId}` : "/products"}>
    <button
      className={`${styles["mongodb-button"]} ${
        currentPage === 'products' ? styles["bold-text"] : ''
      }`}
      onClick={handleProductsClick}
    >
      Real-time Inventory
    </button>
  </a>
  <a href={selectedStoreId ? `/orderHistory?store=${selectedStoreId}` : "/orderHistory"}>
    <button
      className={`${styles["mongodb-button"]} ${
        currentPage === 'orderHistory' ? styles["bold-text"] : ''
      }`}
      onClick={handleOrderHistoryClick}
    >
      Orders
    </button>
  </a>
  <a href={selectedStoreId ? `/salesHistory?store=${selectedStoreId}` : "/salesHistory"}>
    <button
      className={`${styles["mongodb-button"]} ${
        currentPage === 'salesHistory' ? styles["bold-text"] : ''
      }`}
      onClick={handleOrderHistoryClick}
    >
       {utils.demoInfo.industry == 'manufacturing' ? 
          <>Dispatch Events</> :
          <>Sales Events</>}
    </button>
  </a>
  <a href={selectedStoreId ? `/dashboard?store=${selectedStoreId}` : "/dashboard"}>
    <button
      className={`${styles["mongodb-button"]} ${
        currentPage === 'dashboard' ? styles["bold-text"] : ''
      }`}
      onClick={handleOrderHistoryClick}
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

      {currentPage === 'products' && (
        <div>
          {/* Render the Products page */}

          {/* bunch of components */}
        </div>
      )}

      {currentPage === 'orderHistory' && (
        <div>
          {/* Render the Order History page */}

          {/* bunch of components */}
        </div>
      )}

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
