'use client'

import React, { useState } from 'react';

function Footer() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
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
    <div className="layout-footer">
      <div className="dropdown">
        <img src="/images/houseLogo.png" alt="House Logo" className="house-logo" />
        <button className="dropdown-toggle" onClick={handleDropdownToggle}>
          {selectedOption || 'Choose your store'}
          <span className="dropdown-arrow"></span>
        </button>
        {isOpen && (
          <div className="dropdown-menu">
            <a href="#" onClick={() => handleOptionClick('Bogatell Store')}>
              Bogatell Store
            </a>
          </div>
        )}

        <div className="mongodb-button-container">
          <button className="mongodb-button" onClick={handleProductsClick}>
            Products
          </button>
          <button className="mongodb-button" onClick={handleOrderHistoryClick}>
            Order History
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
    </div>
  );
}

export default Footer;
