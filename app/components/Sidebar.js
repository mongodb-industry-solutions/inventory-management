"use client";

import React, { useState, useEffect, useContext } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import styles from "../styles/sidebar.module.css";

function Sidebar({ facets, filterProducts, filterOrders, filterSales, page }) {
  const [isShrunk, setIsShrunk] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [numColorsToShow, setNumColorsToShow] = useState(10);
  const [numItemsToShow, setNumItemsToShow] = useState(10); // State for "Items" list
  const industry = process.env.NEXT_PUBLIC_DEMO_INDUSTRY || "retail";

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
      const itemOrder = ["XS", "S", "M", "L", "XL"];
      return itemOrder.indexOf(a) - itemOrder.indexOf(b);
    });

    if (page === "products") {
      filterProducts(sortedItems, selectedProducts);
    } else if (page === "orders") {
      filterOrders(sortedItems, selectedProducts);
    } else if (page === "sales") {
      filterSales(sortedItems, selectedProducts);
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
    if (page === "products") {
      filterProducts(selectedItems, updatedSelectedProducts);
    } else if (page === "orders") {
      filterOrders(selectedItems, updatedSelectedProducts);
    } else if (page === "sales") {
      filterSales(selectedItems, updatedSelectedProducts);
    }
  };

  const toggleShrink = () => {
    setIsShrunk(!isShrunk);
  };

  const handleExpandColors = () => {
    setNumColorsToShow(numColorsToShow + 10);
  };

  const handleCollapseColors = () => {
    setNumColorsToShow(10);
  };

  const handleExpandItems = () => {
    setNumItemsToShow(numItemsToShow + 10);
  };

  const handleCollapseItems = () => {
    setNumItemsToShow(10);
  };

  return (
    <div className={`${styles.sidebar} ${isShrunk ? styles["shrunk"] : ""}`}>
      <div
        className={`${styles["sidebar-header"]} ${
          isShrunk ? styles["shrunk"] : ""
        }`}
      >
        {isShrunk && (
          <img
            src="/images/filters.png"
            alt="filtersLogo"
            className={styles["filterslogo"]}
          />
        )}
        {!isShrunk && <h3>Filters</h3>}
      </div>

      {!isShrunk && (
        <>
          <div className={styles["size-filters"]}>
            <h3>{industry == "manufacturing" ? "Items" : "Size"}</h3>
            <div className={styles["item-list"]}>
              {facets?.[0]?.facet?.itemsFacet.buckets
                .sort((a, b) => {
                  const itemOrder = ["XS", "S", "M", "L", "XL"];
                  return itemOrder.indexOf(a._id) - itemOrder.indexOf(b._id);
                })
                .slice(0, numItemsToShow) // Render limited items based on `numItemsToShow`
                .map((bucket) => (
                  <label key={bucket._id}>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(bucket._id)}
                      onChange={() => handleItemChange(bucket._id)}
                    />
                    <span>
                      {bucket._id} ({bucket.count})
                    </span>
                  </label>
                ))}

              {numItemsToShow <
                facets?.[0]?.facet?.itemsFacet.buckets.length && (
                <button onClick={handleExpandItems}>Show More</button>
              )}

              {numItemsToShow >=
                facets?.[0]?.facet?.itemsFacet.buckets.length &&
                facets[0].facet.itemsFacet.buckets.length > 10 && (
                  <button onClick={handleCollapseItems}>Show Less</button>
                )}
            </div>
          </div>

          <div className={styles["color-filters"]}>
            <h3>{industry == "manufacturing" ? "Category" : "Color"}</h3>
            <div className={styles["color-list"]}>
              {facets?.[0]?.facet?.productsFacet.buckets
                .slice(0, numColorsToShow)
                .map((bucket) => (
                  <label key={bucket._id}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(bucket._id)}
                      onChange={() => handleProductChange(bucket._id)}
                    />
                    <span>
                      {bucket._id} ({bucket.count})
                    </span>
                  </label>
                ))}
              {numColorsToShow <
                facets?.[0]?.facet?.productsFacet.buckets.length && (
                <button onClick={handleExpandColors}>Show More</button>
              )}

              {numColorsToShow >=
                facets?.[0]?.facet?.productsFacet.buckets.length &&
                facets[0].facet.productsFacet.buckets.length > 10 && (
                  <button onClick={handleCollapseColors}>Show Less</button>
                )}
            </div>
          </div>
        </>
      )}

      <div className={styles["toggle-button"]} onClick={toggleShrink}>
        {isShrunk ? (
          <FaChevronRight style={{ color: "2B664C" }} />
        ) : (
          <FaChevronLeft style={{ color: "2B664C" }} />
        )}
      </div>
    </div>
  );
}

export default Sidebar;
