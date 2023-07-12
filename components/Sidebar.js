'use client'

import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import styles from '../styles/sidebar.module.css';

function Sidebar({facets, filterProducts}) {

  const [isShrunk, setIsShrunk] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);

  


    const handleSizeChange = (event) => {
        const size = event;
        let updatedSelectedSizes = selectedSizes;

        if (selectedSizes.includes(size)) {
            updatedSelectedSizes = selectedSizes.filter((g) => g !== size);
          setSelectedSizes(updatedSelectedSizes);
        } else {
            updatedSelectedSizes = [...selectedSizes, size];
          setSelectedSizes(updatedSelectedSizes);
        }
        filterProducts(updatedSelectedSizes, selectedColors);
      };
    
      const handleColorChange = (event) => {
        const color = event;
        let updatedSelectedColors = selectedColors;

        if (selectedColors.includes(color)) {
          updatedSelectedColors = selectedColors.filter((y) => y !== color);
          setSelectedColors(updatedSelectedColors);
        } else {
          updatedSelectedColors = [...selectedColors, color];
            setSelectedColors(updatedSelectedColors);
        }
        filterProducts(selectedSizes, updatedSelectedColors);
      };

  const toggleShrink = () => {
    setIsShrunk(!isShrunk);
  };

  return (
    <div className={`${styles.sidebar} ${isShrunk ? styles["shrunk"] : ''}`}>
      <div className={`${styles["sidebar-header"]} ${isShrunk ? styles["shrunk"]: ''}`}>
        {isShrunk && <img src="/images/filters.png" alt="filtersLogo" className={styles["filterslogo"]} />}
        {!isShrunk && <h3>Filters</h3>}
      </div>

      {!isShrunk && (
        <>
          <div className={styles["size-filters"]} >
            <h3>Size</h3>
            {facets[0].facet.sizesFacet.buckets.map((bucket) => (
              <label key={bucket._id}>
                <input
                  type="checkbox"
                  checked={selectedSizes.includes(bucket._id)}
                  onChange={() => handleSizeChange(bucket._id)}
                />
                <span>{bucket._id}</span>
              </label>
            ))}
          </div>

          <div className={styles["color-filters"]} >
            <h3>Color</h3>
            {facets[0].facet.colorsFacet.buckets.map((bucket) => (
              <label key={bucket._id}>
                <input
                  type="checkbox"
                  checked={selectedColors.includes(bucket._id)}
                  onChange={() => handleColorChange(bucket._id)}
                />
                <span>{bucket._id}</span>
              </label>
            ))}
          </div>
        </>
      )}

      <div className={styles["toggle-button"]} onClick={toggleShrink}>
      {isShrunk ? (
    <FaChevronRight style={{ color: '2B664C' }} />
  ) : (
    <FaChevronLeft style={{ color: '2B664C' }} />
  )}
      </div>
    </div>
  );
}

export default Sidebar;