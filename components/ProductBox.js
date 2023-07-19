'use client'

import React from 'react';
import { FaTshirt } from 'react-icons/fa';
import styles from '../styles/productbox.module.css';

const ProductBox = ({ product }) => { 

    const totalStoreStockSum = product.total_stock_sum.find((stock) => stock.location === 'store');
    const totalOrderedStockSum = product.total_stock_sum.find((stock) => stock.location === 'ordered');

    const getStockStatus = (storeAmount, orderedAmount, storeThreshold) => {
        let stockStatus = 'ok';

        if (storeAmount < storeThreshold) {
            if(storeAmount + orderedAmount > storeThreshold) {
                stockStatus = 'ordered';
            }
            else {
                stockStatus = 'low';
            }
        }

        return stockStatus;
    };

    const totalStockStatus = getStockStatus(totalStoreStockSum.amount, totalOrderedStockSum.amount, totalStoreStockSum.threshold);
    let itemStockStatus = 'ok';

    for(const item of product.items) {
        const itemStoreStockSum = item.stock.find((stock) => stock.location === 'store');
        const itemOrderedStockSum = item.stock.find((stock) => stock.location === 'ordered');

        let stockStatus = getStockStatus(itemStoreStockSum.amount, itemOrderedStockSum.amount, itemStoreStockSum.threshold);

        if(stockStatus == 'low') {
            itemStockStatus = 'low';
            break;
        } else if(stockStatus == 'ordered') {
            itemStockStatus = 'ordered';
        }
    }

    return (
        <>
            <li className={styles["product-item"]}>
                <a href={`/products/${product._id}`} className={styles["product-link"]}>
                    <div className={styles["shirt_icon"]}>
                        <FaTshirt color={product.color.hex} />
                    </div>
                    <h2>{product.name}</h2>
                    <h3>{product.code}</h3>
                    <p>{product.description}</p>
                    {
                        itemStockStatus == 'low' || totalStockStatus == 'low' ? 
                            <span className={`${styles['alert-label']} ${styles['low']}`}>LOW ON STOCK</span> : 
                            itemStockStatus == 'ordered' || totalStockStatus == 'ordered' ? 
                                <span className={`${styles['alert-label']} ${styles['ordered']}`}>ORDERED STOCK</span> : 
                                null
                    }
                </a>
            </li>
        </>
    );
};

export default ProductBox;