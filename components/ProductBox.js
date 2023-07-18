'use client'

import React from 'react';
import { FaTshirt } from 'react-icons/fa';
import styles from '../styles/productbox.module.css';

const ProductBox = ({ product }) => { 


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
                </a>
            </li>
        </>
    );
};

export default ProductBox;