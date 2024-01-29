'use client'

import React from 'react';
import { useRouter } from 'next/router';
import { FaTshirt } from 'react-icons/fa';
import styles from '../styles/productbox.module.css';

const ProductBox = ({ product }) => { 

    const router = useRouter();
    const { store } = router.query;

    const lightColors = [
        '#B1FF05','#E9FF99','#B45AF2','#F2C5EE',
        '#00D2FF','#A6FFEC', '#FFE212', '#FFEEA9'
    ];

    const leafUrl = lightColors.includes(product.color.hex) ? "/images/leaf_dark.png" : "/images/leaf_white.png";

    let totalStoreStockSum = {};

    totalStoreStockSum = store ? 
        product.total_stock_sum.find((stock) => stock.location.id === store)
        : product.total_stock_sum.find((stock) => stock.location.type === "store");
    
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

    const totalStockStatus = getStockStatus(totalStoreStockSum?.amount, totalStoreStockSum?.ordered, totalStoreStockSum?.threshold);
    let itemStockStatus = 'ok';
    let itemStoreStockSum = {};

    for(const item of product.items) {

        itemStoreStockSum = store ?
            item.stock.find((stock) => stock.location.id === store)
            : item.stock.find((stock) => stock.location.type === "store");

        let stockStatus = getStockStatus(itemStoreStockSum?.amount, itemStoreStockSum?.ordered, itemStoreStockSum?.threshold);

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
                    href={store ? `/products/${product._id}?store=${store}` : `/products/${product._id}`}
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