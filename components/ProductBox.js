'use client'

import React from 'react';
import { useUser } from '../context/UserContext';
import { FaTshirt } from 'react-icons/fa';
import styles from '../styles/productbox.module.css';

const ProductBox = ({ product }) => { 

    const { selectedUser } = useUser();

    const lightColors = [
        '#B1FF05','#E9FF99','#B45AF2','#F2C5EE',
        '#00D2FF','#A6FFEC', '#FFE212', '#FFEEA9'
    ];

    const leafUrl = lightColors.includes(product.color.hex) ? "/images/leaf_dark.png" : "/images/leaf_white.png";

    let selectedStoreId = '';
    if (selectedUser?.permissions.stores[0]) {
        selectedStoreId = selectedUser.permissions.stores[0].store_id;
    } else {
        selectedStoreId = '65a545fb4a8f64e8f88fb897';
    }


    let totalStoreStockSum = {};

    totalStoreStockSum = product.total_stock_sum.find((stock) => stock.location.id === selectedStoreId);
    
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

    const totalStockStatus = getStockStatus(totalStoreStockSum.amount, totalStoreStockSum.ordered, totalStoreStockSum.threshold);
    let itemStockStatus = 'ok';
    let itemStoreStockSum = {};

    for(const item of product.items) {

        itemStoreStockSum = item.stock.find((stock) => stock.location.id === selectedStoreId);

        let stockStatus = getStockStatus(itemStoreStockSum.amount, itemStoreStockSum.ordered, itemStoreStockSum.threshold);

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
                <a 
                    href={selectedStoreId ? `/products/${product._id}?store=${selectedStoreId}` : `/products/${product._id}`}
                    className={styles["product-link"]}>
                        <div className={styles["shirt_icon"]}>
                            <FaTshirt color={product.color.hex} />
                            <img src={leafUrl} alt="Leaf" className={styles["leaf"]}/>
                        </div>
                        <h2>{product.name}</h2>
                        <h3>{product.code}</h3>
                        <p>{product.description}</p>
                        {
                            itemStockStatus == 'low' || totalStockStatus == 'low' ? 
                                <span className={`${styles['alert-label']} ${styles['low']}`}>LOW STOCK</span> : 
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