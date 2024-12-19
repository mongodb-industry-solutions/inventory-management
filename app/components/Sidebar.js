'use client'

import React, { useState, useEffect, useContext } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import styles from '../styles/sidebar.module.css';

function Sidebar({facets, filterProducts, filterOrders, filterSales, page }) {

  const [isShrunk, setIsShrunk] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [numColorsToShow, setNumColorsToShow] = useState(10);
  const [industry, setIndustry] = useState('retail'); // Default value is 'retail'


    // Fetch the industry from the API when the component mounts
    useEffect(() => {
      const fetchIndustry = async () => {
        try {
          const response = await fetch('/api/getIndustry');
          if (response.ok) {
            const data = await response.json();
            setIndustry(data.industry);
          } else {
            console.error('Failed to fetch industry information');
          }
        } catch (error) {
          console.error('Error fetching industry:', error);
        }
      };
  
      fetchIndustry();
    }, []);

  const handleItemChange = (event) => {
    const item = event;
    let updatedSelectedItems = selectedItems;
  
    if (selectedItems.includes(item)) {
      updatedSelectedItems = selectedItems.filter((g) => g !== item);
    } else {
      updatedSelectedItems = [...selectedItems, item];
    }
    setSelectedItems(updatedSelectedItems);
  
    // Sort the selected sizes according to the desired order
    const sortedItems = updatedSelectedItems.sort((a, b) => {
      const itemOrder = ['XS', 'S', 'M', 'L', 'XL'];
      return itemOrder.indexOf(a) - itemOrder.indexOf(b);
    });
  
    if (page === 'products') {
      filterProducts(sortedItems, selectedProducts);
    } else if (page === 'orders') {
      filterOrders(sortedItems, selectedProducts);
    } else if (page === 'sales') {
      filterSales(sortedItems, selectedProducts);  {/* Call filterSales for sales page */}
    }
      };
    
      const handleProductChange = (event) => {
        const color = event;
        let updatedSelectedProducts = selectedProducts;

        if (selectedProducts.includes(color)) {
          updatedSelectedProducts = selectedProducts.filter((y) => y !== color);
          setSelectedProducts(updatedSelectedProducts);
        } else {
          updatedSelectedProducts = [...selectedProducts, color];
            setSelectedProducts(updatedSelectedProducts);
        }
        if (page === 'products') {
          filterProducts(selectedItems, updatedSelectedProducts);
        } else if (page === 'orders') {
          filterOrders(selectedItems, updatedSelectedProducts);
        } else if (page === 'sales') {
          filterSales(selectedItems, updatedSelectedProducts);  {/* Call filterSales for sales page */}
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
            <h3>
            { industry == 'manufacturing' ? 
                "Items" : 
                "Size"
              }
            </h3>
            {facets?.[0]?.facet?.itemsFacet.buckets
  .sort((a, b) => {
    const itemOrder = ['XS', 'S', 'M', 'L', 'XL'];
    return itemOrder.indexOf(a._id) - itemOrder.indexOf(b._id);
  })
  .map((bucket) => (
    <label key={bucket._id}>
      <input
        type="checkbox"
        checked={selectedItems.includes(bucket._id)}
        onChange={() => handleItemChange(bucket._id)}
      />
      <span>{bucket._id} ({bucket.count})</span>
    </label>
  ))}
          </div>

          <div className={styles["color-filters"]} >
            <h3>
              { industry == 'manufacturing' ? 
                "Category" : 
                "Color"
              }
            </h3>
            <div className={styles["color-list"]}>
              {facets?.[0]?.facet?.productsFacet.buckets.slice(0, numColorsToShow).map((bucket) => (
                <label key={bucket._id}>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(bucket._id)}
                    onChange={() => handleProductChange(bucket._id)}
                  />
                  <span>{bucket._id} ({bucket.count})</span>
                </label>
              ))}
              {numColorsToShow < facets?.[0]?.facet?.productsFacet.buckets.length && (
                <button onClick={handleExpand}>Show More</button>
              )}

              {numColorsToShow >= facets?.[0]?.facet?.productsFacet.buckets.length && facets[0].facet.productsFacet.buckets.length > 10  && (
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