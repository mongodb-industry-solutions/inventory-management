'use client';

import React, { useState, useEffect, useContext } from 'react';
import Select from 'react-select';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import { useUser } from '../context/UserContext';
import { useRouter } from 'next/router';
import { useToast } from '@leafygreen-ui/toast';
import StockLevelBar from './StockLevelBar';
import { debounce } from 'lodash'; // Import lodash debounce
import styles from '../styles/popup.module.css';

const ReplenishmentPopup = ({ product, onClose, onSave }) => {
  const { pushToast } = useToast();
  const { selectedUser } = useUser();
  const router = useRouter();
  const { location } = router.query;

  const transaction = {
    type: 'inbound',
    user_id: selectedUser?._id,
    location: {
      origin: { type: 'warehouse' },
      destination: {
        type: 'store',
        id: selectedUser?.permissions?.locations.find(
          (s) => s.id === location
        )?.id,
        name: selectedUser?.permissions?.locations.find(
          (s) => s.id === location
        )?.name,
        area_code: selectedUser?.permissions?.locations.find(
          (s) => s.id === location
        )?.area_code,
      },
    },
    placement_timestamp: '',
    items: [],
  };

  const [rows, setRows] = useState([]);

  useEffect(() => {
    const lowStockRows = [];
    for (const item of product.items) {
      const itemStock = item?.stock.find(
        (stock) => stock.location.id === location
      );

      if (itemStock?.amount < itemStock?.threshold) {
        const newItem = structuredClone(item);
        delete newItem.stock;
        newItem.status = [];
        newItem.amount = Math.max(
          0,
          itemStock.target - itemStock.amount
        );
        newItem.product = {
          id: product._id,
          name: product.name,
          ...(product.color && {
            color: {
              name: product.color?.name,
              hex: product.color?.hex,
            },
          }),
          image: { url: product.image?.url },
        };
        lowStockRows.push(newItem);
      }
    }
    setRows(lowStockRows); // Removed redundant spread
  }, [product.items, location, product._id]);

  const handleAddRow = () => {
    const newItemSize = product.items.find(
      (item) => !rows.some((rowItem) => rowItem.name === item.name)
    )?.name;

    if (newItemSize) {
      const item = product.items.find(
        (item) => item.name === newItemSize
      );
      const itemStock = item?.stock.find(
        (stock) => stock.location.id === location
      );

      const newItem = structuredClone(item);
      delete newItem.stock;
      newItem.status = [];
      newItem.amount = Math.max(
        0,
        itemStock.target - itemStock.amount
      );
      newItem.product = {
        id: product._id,
        name: product.name,
        ...(product.color && {
          color: {
            name: product.color?.name,
            hex: product.color?.hex,
          },
        }),
        image: { url: product.image?.url },
      };

      setRows((prevRows) => [...prevRows, newItem]);
    }
  };

  const handleItemChange = (index, newItemName) => {
    const newItem = product.items.find(
      (item) => item.name === newItemName
    );
    const newItemStock = newItem?.stock.find(
      (stock) => stock.location.id === location
    );
    const newAmount = Math.max(
      0,
      newItemStock.target - newItemStock.amount
    );

    setRows((prevRows) =>
      prevRows.map((row, i) =>
        i === index
          ? {
              ...row,
              name: newItemName,
              amount: newAmount,
              sku: newItem?.sku,
              delivery_time: newItem?.delivery_time,
            }
          : row
      )
    );
  };

  const handleAmountUpdate = (index, newAmount) => {
    setRows((prevRows) =>
      prevRows.map((row, i) =>
        i === index
          ? { ...row, amount: parseInt(newAmount, 10) }
          : row
      )
    );
  };

  const handleDeleteRow = (index) => {
    setRows((prevRows) => prevRows.filter((_, i) => i !== index));
  };

  // Debounced Save Order function
  const debouncedHandleSaveOrder = debounce(async (data) => {
    const newTransaction = {
      ...transaction,
      items: data,
    };

    try {
      const response = await fetch('/api/addTransaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTransaction),
      });

      if (response.ok) {
        console.log('Transaction saved successfully');
        onClose();
        pushToast({
          title: 'Order placed successfully',
          variant: 'success',
        });
        setRows([]); // Clear rows after successful order
      } else {
        console.error('Error saving transaction');
      }
    } catch (e) {
      console.error(e);
    }
  }, 500); // Added debounce with a 500ms delay

  return (
    <>
      <div className={styles['backdrop']}></div>
      <div className={styles['popup']}>
        <div className={styles['popup-content']}>
          <button
            className={styles['close-button']}
            onClick={onClose}
          >
            <FaTimes className={styles['close-icon']} />
          </button>
          <h3>Replenish Stock</h3>
          <div className={styles['table-container']}>
            <div className={styles['table-wrapper']}>
              <table>
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Current Stock</th>
                    <th>Order Amount</th>
                    <th>Delivery Time</th>
                    <th>Stock Level</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const item = product.items.find(
                      (item) => item.name === row.name
                    );
                    const itemStock = item?.stock.find(
                      (stock) => stock.location.id === location
                    );

                    return (
                      <tr key={index}>
                        <td>
                          <Select
                            value={{
                              label: row.name,
                              value: row.name,
                            }}
                            onChange={(selectedOption) =>
                              handleItemChange(
                                index,
                                selectedOption.value
                              )
                            }
                            options={product.items
                              .filter(
                                (item) =>
                                  !rows.some(
                                    (rowItem) =>
                                      rowItem.name === item.name
                                  )
                              )
                              .map((item) => ({
                                label: item.name,
                                value: item.name,
                              }))}
                            menuPortalTarget={document.body}
                            styles={{
                              menuPortal: (base) => ({
                                ...base,
                                zIndex: 9999,
                              }),
                            }}
                          />
                        </td>
                        <td>{itemStock?.amount ?? 0}</td>
                        <td>
                          <Select
                            value={{
                              label: row.amount.toString(),
                              value: row.amount,
                            }}
                            onChange={(selectedOption) =>
                              handleAmountUpdate(
                                index,
                                selectedOption.value
                              )
                            }
                            options={[
                              ...Array(
                                Math.max(
                                  0,
                                  (itemStock?.target ?? 0) -
                                    (itemStock?.amount ?? 0)
                                ) + 1
                              ).keys(),
                            ].map((value) => ({
                              label: value.toString(),
                              value: value,
                            }))}
                            menuPortalTarget={document.body}
                            styles={{
                              menuPortal: (base) => ({
                                ...base,
                                zIndex: 9999,
                              }),
                            }}
                          />
                        </td>
                        <td>
                          {item?.delivery_time?.amount || 0}{' '}
                          {item?.delivery_time?.unit || ''}
                        </td>
                        <td>
                          <StockLevelBar
                            stock={item?.stock}
                            locationId={location}
                          />
                        </td>
                        <td>
                          <button
                            className={styles['delete-button']}
                            onClick={() => handleDeleteRow(index)}
                          >
                            <FaTrash
                              className={styles['delete-icon']}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              className={styles['add-button']}
              onClick={handleAddRow}
            >
              <FaPlus className={styles['add-icon']} />
            </button>
          </div>
          <div className={styles['total-time']}>
            TOTAL TIME OF DELIVERY:{' '}
            {rows.length > 0
              ? Math.max(
                  ...rows.map((item) => item.delivery_time.amount)
                )
              : 0}{' '}
            SECONDS
          </div>
          <button
            className={styles['save-button']}
            onClick={() => debouncedHandleSaveOrder(rows)} // Use debounced function
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
};

export default ReplenishmentPopup;
