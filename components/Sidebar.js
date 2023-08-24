'use client'

import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import styles from '../styles/sidebar.module.css';

function Sidebar({facets, filterProducts, filterOrders, filterSales, page }) {

  const [isShrunk, setIsShrunk] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [numColorsToShow, setNumColorsToShow] = useState(10);


  const handleSizeChange = (event) => {
    const size = event;
    let updatedSelectedSizes = selectedSizes;
  
    if (selectedSizes.includes(size)) {
      updatedSelectedSizes = selectedSizes.filter((g) => g !== size);
    } else {
      updatedSelectedSizes = [...selectedSizes, size];
    }
    setSelectedSizes(updatedSelectedSizes);
  
    // Sort the selected sizes according to the desired order
    const sortedSizes = updatedSelectedSizes.sort((a, b) => {
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL'];
      return sizeOrder.indexOf(a) - sizeOrder.indexOf(b);
    });
  
    if (page === 'products') {
      filterProducts(sortedSizes, selectedColors);
    } else if (page === 'orders') {
      filterOrders(sortedSizes, selectedColors);
    } else if (page === 'sales') {
      filterSales(sortedSizes, selectedColors);  {/* Call filterSales for sales page */}
    }
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
        if (page === 'products') {
          filterProducts(selectedSizes, updatedSelectedColors);
        } else if (page === 'orders') {
          filterOrders(selectedSizes, updatedSelectedColors);
        } else if (page === 'sales') {
          filterSales(selectedSizes, updatedSelectedColors);  {/* Call filterSales for sales page */}
        }
      };

  const toggleShrink = () => {
    setIsShrunk(!isShrunk);
  };

  const handleExpand = () => {
    setNumColorsToShow(numColorsToShow + 10);
  };

  const handleCollapse = () => {
    setNumColorsToShow(10);
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
            {facets[0].facet?.sizesFacet.buckets
  .sort((a, b) => {
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL'];
    return sizeOrder.indexOf(a._id) - sizeOrder.indexOf(b._id);
  })
  .map((bucket) => (
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
            <div className={styles["color-list"]}>
              {facets[0].facet?.colorsFacet.buckets.slice(0, numColorsToShow).map((bucket) => (
                <label key={bucket._id}>
                  <input
                    type="checkbox"
                    checked={selectedColors.includes(bucket._id)}
                    onChange={() => handleColorChange(bucket._id)}
                  />
                  <span>{bucket._id}</span>
                </label>
              ))}
              {numColorsToShow < facets[0].facet?.colorsFacet.buckets.length && (
                <button onClick={handleExpand}>Show More</button>
              )}

              {numColorsToShow >= facets[0].facet?.colorsFacet.buckets.length && facets[0].facet.colorsFacet.buckets.length > 10  && (
                <button onClick={handleCollapse}>Show Less</button>
              )}
            </div>
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