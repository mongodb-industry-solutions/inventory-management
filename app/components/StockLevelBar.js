'use client'

import React from 'react';
import bar_styles from '../styles/stocklevelbar.module.css';

const StockLevelBar = ({ stock, storeId }) => {

    const storeStock = storeId ? 
        stock.find(stock => stock.location.id === storeId) 
        : stock.find(stock => stock.location.type === "store") ;
    const color = storeStock?.amount >= storeStock?.threshold ? 'green' : 'orange';
    const storeFill = (storeStock?.amount / storeStock?.target) * 100;
    const orderedFill = ((storeStock?.ordered) / storeStock?.target) * 100;

    return (
        <div className={bar_styles['container']}>
            <div className={bar_styles['target-level']}>
                <div className={bar_styles['store-level']} style={{ background: color, width: `${storeFill}%` }}></div>
                <div className={bar_styles['ordered-level']} style={{ width: `${orderedFill}%` }}></div>
            </div>
            <span className={bar_styles['label']}>{storeStock?.target}</span>
        </div>
    );
};

export default StockLevelBar;