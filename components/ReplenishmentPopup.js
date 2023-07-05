'use client'

import React, { useState } from 'react';


const ReplenishmentPopup = ({ onClose }) => {
    return (
      <div className="popup">
        <div className="popup-content">
          {/* Add your popup content here */}
          <h2>Popup Content</h2>
          <p>This is the content of the popup.</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  };
  
  export default ReplenishmentPopup;