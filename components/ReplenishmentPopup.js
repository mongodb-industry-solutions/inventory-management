'use client'

import React, { useState } from 'react';
import bar_styles from '../styles/progressbar.module.css';


const ReplenishmentPopup = ({ product, onClose }) => {

    const [rows, setRows] = useState([]);

    const handleAddRow = () => {
        const defaultSize = product.items[0]?.size || '';
        setRows([...rows, { size: defaultSize }]);
    };

    const handleSizeChange = (index, newSize) => {
        setRows((prevRows) =>
          prevRows.map((row, i) => (i === index ? { ...row, size: newSize } : row))
        );
      };
    
    const handleAmountUpdate = (index, newAmount) => {
    setRows((prevRows) =>
        prevRows.map((row, i) => (i === index ? { ...row, amount: parseInt(newAmount, 10) } : row))
    );
    };

    const handleDeleteRow = (index) => {
        const updatedRows = [...rows];
        updatedRows.splice(index, 1);
        setRows(updatedRows);
    };

    const handleSaveOrder = async (data) => {
        console.log(data);
    };

    return (
      <div className="popup">
        <div className="popup-content">
          {/* Add your popup content here */}
          <h2>Popup Content</h2>
          <p>This is the content of the popup.</p>
          <button onClick={handleAddRow}>Add Row</button>
        <table>
          <thead>
            <tr>
              <th>Size</th>
              <th>Store</th>
              <th>Order Amount</th>
              <th>Delivery Time</th>
              <th>Stock Level</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
                const item = product.items.find(item => item.size === rows[index].size);
                const stockLevel = item?.stock.find(stock => stock.location === 'store')?.amount ?? 0;
                const stockThreshold = item?.stock.find(stock => stock.location === 'store')?.threshold ?? 10;
                const progressBarColor = stockLevel >= stockThreshold ? 'green' : 'orange';
                const progressBarFill = (stockLevel / 20) * 100;

                return (
                <tr key={index}>
                    <td>
                        <select value={row.size} onChange={(e) => handleSizeChange(index, e.target.value)}>{product.items.map((item) => (
                            <option key={item.sku} value={item.size}>
                            {item.size}
                            </option>))}
                        </select>
                    </td>
                    <td>
                        {item?.stock.find(stock => stock.location === 'store')?.amount ?? 0}
                    </td>
                    <td>
                        <input type="number" min="1" max="20" onChange={(e) => handleAmountUpdate(index, e.target.value)} />
                    </td>
                    <td>
                        {item?.delivery_time.amount} {item?.delivery_time.unit}
                    </td>
                    <td>
                        <div className={bar_styles['progress-bar-container']}>
                        <div className={bar_styles['progress-bar-reference']}>
                            <div className={bar_styles['progress-bar-level']} style={{ background: progressBarColor, width: `${progressBarFill}%` }}></div>
                        </div>
                        <span className={bar_styles['progress-bar-label']}>20</span>
                        </div>
                    </td>
                    <td>
                    <button onClick={() => handleDeleteRow(index)}>Delete</button>
                    </td>
                </tr>
                )
            })}
          </tbody>
        </table>
          <button onClick={onClose}>Close</button>
          <button onClick={() => handleSaveOrder(rows)}>Save</button>
        </div>
      </div>
    );
  };
  
  export default ReplenishmentPopup;