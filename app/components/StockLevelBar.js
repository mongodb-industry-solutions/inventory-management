'use client';

import React from 'react';
import bar_styles from '../styles/stocklevelbar.module.css';

const StockLevelBar = ({ stock, locationId }) => {
  const thisStock = locationId
    ? stock.find((stock) => stock.location.id === locationId)
    : stock.find((stock) => stock.location.type !== 'warehouse');
  const color =
    thisStock?.amount >= thisStock?.threshold ? 'green' : 'orange';
  const availableFill = (thisStock?.amount / thisStock?.target) * 100;
  const orderedFill = (thisStock?.ordered / thisStock?.target) * 100;

  return (
    <div className={bar_styles['container']}>
      <div className={bar_styles['target-level']}>
        <div
          className={bar_styles['available-level']}
          style={{ background: color, width: `${availableFill}%` }}
        ></div>
        <div
          className={bar_styles['ordered-level']}
          style={{ width: `${orderedFill}%` }}
        ></div>
      </div>
      <span className={bar_styles['label']}>{thisStock?.target}</span>
    </div>
  );
};

export default StockLevelBar;
