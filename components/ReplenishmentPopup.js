'use client'

import React, { useState, useEffect } from 'react';
import Select from 'react-select';
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

    useEffect(() => {

        const lowStockRows = [];

        for(const item of product.items) {
            const itemStoreStock = item?.stock.find(stock => stock.location === 'store');

            if( itemStoreStock.amount < itemStoreStock.threshold) {
                var newItem = {
                    amount: Math.max(0,itemStoreStock.target - itemStoreStock.amount),
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
                lowStockRows.push(newItem);
            }
        }

        setRows([...rows, ...lowStockRows]);
    }
    , []);

    const handleAddRow = () => {
        const item = product.items[0];
        const itemStoreStock = item?.stock.find(stock => stock.location === 'store');

        const newItem = {
            amount: Math.max(0,itemStoreStock.target - itemStoreStock.amount),
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
        const newItem = product.items.find(item => item.size === newSize);
        const newItemStoreStock = newItem?.stock.find(stock => stock.location === 'store');
        const newSku = newItem?.sku;
        const newDeliveryTime = newItem?.delivery_time;
        const newAmount =  Math.max(0,newItemStoreStock.target - newItemStoreStock.amount);

        setRows((prevRows) =>
          prevRows.map((row, i) => (i === index ? { ...row, size: newSize, amount: newAmount, sku: newSku, delivery_time: newDeliveryTime } : row))
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
                                    const itemStoreStock = item?.stock.find(stock => stock.location === 'store');

                                    return (
                                    <tr key={index}>
                                        <td>
                                            <Select 
                                                    value={{label: row.size, value: row.size}}
                                                    onChange={(selectedOption) => handleSizeChange(index, selectedOption.value)}
                                                    options={product.items.map((item) => ({
                                                        label: item.size,
                                                        value: item.size,
                                                    }))}
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                        </td>
                                        <td>
                                            {itemStoreStock?.amount ?? 0}
                                        </td>
                                        <td className={styles["select-column"]}>
                                                <Select 
                                                    value={{label: rows[index].amount.toString(), value: rows[index].amount}}
                                                    onChange={(selectedOption) => handleAmountUpdate(index, parseInt(selectedOption.value))}
                                                    options={[...Array(Math.max(0, itemStoreStock?.target - itemStoreStock?.amount) + 1).keys()].map((value) => ({
                                                        label: value.toString(),
                                                        value: value,
                                                    }))}
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
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