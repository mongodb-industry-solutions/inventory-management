'use client'

import React, { useState } from 'react';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';

import StockLevelBar from './StockLevelBar';

import styles from '../styles/popup.module.css';


const ReplenishmentPopup = ({ product, onClose }) => {

    const order = {
        user_id: {
            $oid: '649ef73a7827d12200b87895'
        },
        location: {
            origin: 'warehouse',
            destination: 'store'
        },
        placement_timestamp: '',
        items: []
    }

    const [rows, setRows] = useState(order.items);

    const handleAddRow = () => {
        const item = product.items[0];

        const newItem = {
            amount: 0,
            color: {
                hex: product.color.hex,
                name: product.color.name
            },
            delivery_time: item?.delivery_time,
            product: {
                id: product._id,
                name: product.name
            },
            size: item?.size || '',
            sku: item?.sku || '',
            status: []
        }
        setRows([...rows, newItem]);
    };

    const handleSizeChange = (index, newSize) => {
        const newSku = product.items.find(item => item.size === newSize)?.sku;
        const newDeliveryTime = product.items.find(item => item.size === newSize)?.delivery_time;

        setRows((prevRows) =>
          prevRows.map((row, i) => (i === index ? { ...row, size: newSize, sku: newSku, delivery_time: newDeliveryTime } : row))
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

        order.items = data;
        
        try {
            const response = await fetch('/api/createOrder', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ order }),
              });
            if (response.ok) {
                console.log('Order saved successfully');
                onClose();
                setRows([]);

                const fetchPromises = [];

                const data = await response.json();
                const orderId = data.orderId;

                //Move to store
                for (let i = 0; i < order.items?.length; i++) {
                    let item = order.items[i];

                    try {
                        fetchPromises.push(fetch(`/api/moveToStore?order_id=${orderId}`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ item }),
                          }));
                        if (response.ok) {
                            //console.log(item.sku + ' moved to store successfully.');
                        } else {
                            console.log('Error moving to store item ' + item.sku + '.');
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
                await Promise.all(fetchPromises);

            } else {
                console.log('Error saving order');
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <>
        <div className={styles["backdrop"]}></div>
        <div className={styles["popup"]}>
            <div className={styles["popup-content"]}>
                {/* Add your popup content here */}
                <button className={styles["close-button"]} onClick={onClose}>
                    <FaTimes className={styles["close-icon"]}/>
                </button>
                <h3>Replenish Stock</h3>
                <div className={styles["table-container"]}>
                    <div className={styles["table-wrapper"]}>
                        <table>
                            <thead>
                                <tr>
                                <th>Size</th>
                                <th>Store</th>
                                <th>Order Amount</th>
                                <th>Delivery Time</th>
                                <th>Stock Level</th>
                                <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => {
                                    const item = product.items.find(item => item.size === rows[index].size);

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
                                            {<StockLevelBar stock={item?.stock} />}
                                        </td>
                                        <td>
                                        <button className={styles["delete-button"]} onClick={() => handleDeleteRow(index)}>
                                            <FaTrash className={styles["delete-icon"]}/>
                                        </button>
                                        </td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <button className={styles["add-button"]} onClick={handleAddRow}>
                        <FaPlus className={styles["add-icon"]}/>
                    </button>
                </div>
                    <div className={styles["total-time"]}>
                        TOTAL TIME OF DELIVERY: {rows.length > 0 ? Math.max(...rows.map(item => item.delivery_time.amount)) : 0} SECONDS
                    </div>
                    <button className={styles["save-button"]} onClick={() => handleSaveOrder(rows)}>Save</button>
            </div>
        </div>
      </>
    );
  };
  
  export default ReplenishmentPopup;