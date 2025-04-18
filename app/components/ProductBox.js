"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/router";
import { FaTshirt, FaWhmcs } from "react-icons/fa";
import styles from "../styles/productbox.module.css";

const ProductBox = ({ product }) => {
  const [imageError, setImageError] = useState(false);

  const router = useRouter();
  const { location } = router.query;
  const industry = process.env.NEXT_PUBLIC_DEMO_INDUSTRY || "retail";

  const lightColors = [
    "#B1FF05",
    "#E9FF99",
    "#B45AF2",
    "#F2C5EE",
    "#00D2FF",
    "#A6FFEC",
    "#FFE212",
    "#FFEEA9",
    "#ffffff",
    "#FFFFFF",
  ];

  const leafUrl = lightColors.includes(product.color?.hex)
    ? "/images/leaf_dark.png"
    : "/images/leaf_white.png";

  let totalStockSum = {};

  totalStockSum = location
    ? product.total_stock_sum.find((stock) => stock.location.id === location)
    : product.total_stock_sum.find(
        (stock) => stock.location.type !== "warehouse"
      );

  const getStockStatus = (amount, ordered, threshold) => {
    let stockStatus = "ok";

    if (amount < threshold) {
      if (amount + ordered > threshold) {
        stockStatus = "ordered";
      } else {
        stockStatus = "low";
      }
    }

    return stockStatus;
  };

  const totalStockStatus = getStockStatus(
    totalStockSum?.amount,
    totalStockSum?.ordered,
    totalStockSum?.threshold
  );
  let itemStockStatus = "ok";
  let itemStockSum = {};

  for (const item of product.items) {
    itemStockSum = location
      ? item.stock.find((stock) => stock.location.id === location)
      : item.stock.find((stock) => stock.location.type !== "warehouse");

    let stockStatus = getStockStatus(
      itemStockSum?.amount,
      itemStockSum?.ordered,
      itemStockSum?.threshold
    );

    if (stockStatus == "low") {
      itemStockStatus = "low";
      break;
    } else if (stockStatus == "ordered") {
      itemStockStatus = "ordered";
    }
  }

  return (
    <>
      <li className={styles["product-item"]}>
        <a
          href={
            location
              ? `/products/${product._id}?location=${location}`
              : `/products/${product._id}`
          }
          className={styles["product-link"]}
        >
          <div className={styles["image-container"]}>
            {imageError || !product.image?.url ? (
              industry == "manufacturing" ? (
                <FaWhmcs color="grey" className={styles["default-icon"]} />
              ) : (
                <>
                  <FaTshirt
                    color={product.color?.hex}
                    className={styles["default-icon"]}
                  />
                  <img src={leafUrl} alt="Leaf" className={styles["leaf"]} />
                </>
              )
            ) : (
              <img
                src={product.image?.url}
                alt="Product Image"
                className={styles["product-image"]}
                onError={() => setImageError(true)}
              />
            )}
          </div>
          <h2>{product.name}</h2>
          <p>{product.code}</p>
          {itemStockStatus == "low" || totalStockStatus == "low" ? (
            <span className={`${styles["alert-label"]} ${styles["low"]}`}>
              LOW STOCK
            </span>
          ) : itemStockStatus == "ordered" || totalStockStatus == "ordered" ? (
            <span className={`${styles["alert-label"]} ${styles["ordered"]}`}>
              ORDERED STOCK
            </span>
          ) : null}
        </a>
      </li>
    </>
  );
};

export default ProductBox;
