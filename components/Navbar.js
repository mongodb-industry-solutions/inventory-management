'use client'

import React, { useState } from 'react';

import styles from '../styles/navbar.module.css';

function Footer() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('Bogatell Store');
  const [currentPage, setCurrentPage] = useState('');

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


  return (
    <div className={styles["layout-footer"]}>
      <div className={styles["dropdown"]}>
        <img src="/images/houseLogo.png" alt="House Logo" className={styles["house-logo"]} />
        <button className={styles["dropdown-toggle"]} onClick={handleDropdownToggle}>
          {selectedOption || 'Choose your store'}
          <span className={styles["dropdown-arrow"]}></span>
        </button>
        {isOpen && (
          <div className={styles["dropdown-menu"]}>
            <a href="#" onClick={() => handleOptionClick('Bogatell Store')}>
              Bogatell Store
            </a>
            <a >
              <span className={`${styles["non-clickable-option"]}`} style={{ color: 'grey' }}>Gracia Store</span>
            </a>
          </div>
        )}

        <div className={styles["mongodb-button-container"]}>
          <a href="/products">
            <button className={styles["mongodb-button"]} onClick={handleProductsClick}>
              Real-time Inventory
            </button></a>
          <a href="/orderHistory">
            <button className={styles["mongodb-button"]} onClick={handleOrderHistoryClick}>
              Orders
            </button></a>
          <a href="/salesHistory">
            <button className={styles["mongodb-button"]} onClick={handleOrderHistoryClick}>
              Sales Events
            </button></a>
          <a href="/dashboard">
            <button className={styles["mongodb-button"]} onClick={handleOrderHistoryClick}>
              Analytics
            </button></a>
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

export default Footer;
