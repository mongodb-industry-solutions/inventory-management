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
          </div>
        )}

        <div className={styles["mongodb-button-container"]}>
        <a href="/products">
          <button className={styles["mongodb-button"]} onClick={handleProductsClick}>
            Products
          </button></a>
          <a href="/orderHistory">
          <button className={styles["mongodb-button"]} onClick={handleOrderHistoryClick}>
            Order History
          </button></a>
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
    </div>
  );
}

export default Footer;
