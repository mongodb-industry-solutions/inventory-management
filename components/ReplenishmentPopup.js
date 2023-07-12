'use client'

import React, { useState } from 'react';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';

import StockLevelBar from './StockLevelBar';

import styles from '../styles/popup.module.css';


const ReplenishmentPopup = ({ product, onClose, showPopup }) => {

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

    const renderBackdrop = (props) => <div className={styles["backdrop"]} {...props} />;
   

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
                id: {$oid: product._id},
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

        const status = {
            name: 'placed',
            update_timestamp: new Date().toISOString()
        };

        order.placement_timestamp = new Date().toISOString();
        order.items = data;
        order.items.forEach(item => item.status.push(status));

        console.log(order);

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
                <div className={styles["table"]}>
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
                    <button className={styles["add-button"]} onClick={handleAddRow}>
                        <FaPlus className={styles["add-icon"]}/>
                    </button>
                    </div>
                   
                    <button className={styles["save-button"]} onClick={() => handleSaveOrder(rows)}>Save</button>
            </div>
        </div>
      </>
    );
  };
  
  export default ReplenishmentPopup;