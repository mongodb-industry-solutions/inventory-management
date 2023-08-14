'use client'

import React, { useState, useEffect }  from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import styles from '../styles/alertbanner.module.css';

const AlertBanner = ({ item, onClose }) => { 

    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timeout = setTimeout(() => {
          onClose();
        }, 10000);
    
        return () => clearTimeout(timeout);
      }, [onClose]);
    
      const handleClose = () => {
        setVisible(false);
        onClose();
      };

    return visible ?  (
        <div className={styles["alert-banner"]}>
            <span>
              Item &nbsp; 
              <a href={`/products/${item.product_id}`}>
                {item.sku}
              </a> 
              &nbsp; is low stock!
            </span>
            <button className={styles["close-btn"]} onClick={handleClose}>
              <FontAwesomeIcon icon={faCircleXmark} />
            </button>
        </div>
    ) : null;
};

export default AlertBanner;