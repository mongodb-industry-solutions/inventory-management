import React, { useState } from 'react';
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShirt } from '@fortawesome/free-solid-svg-icons';

import product_styles from '../../styles/product.module.css';
import bar_styles from '../../styles/progressbar.module.css';
import Popup from '../../components/ReplenishmentPopup';

export default function Product({ product }) {

    const totalStoreStock = product.total_stock_sum.find(stock => stock.location === 'store');
    const totalOrderedStock = product.total_stock_sum.find(stock => stock.location === 'ordered');
    const totalProgressBarColor = totalStoreStock?.amount >= totalStoreStock?.threshold ? 'green' : 'orange';
    const totalProgressBarStoreFill = (totalStoreStock?.amount / totalStoreStock?.target) * 100;
    const totalProgressBarOrderedFill = ((totalOrderedStock?.amount) / totalStoreStock?.target) * 100;
    
    const [showPopup, setShowPopup] = useState(false);

    const handleOpenPopup = () => {
        setShowPopup(true);
    };

    const handleClosePopup = () => {
        setShowPopup(false);
    };

    return (
        <div className={product_styles['product-detail-content']}>
            <div className={product_styles['icon']}>
                <FontAwesomeIcon icon={faShirt} style={{ color: product.color.hex, fontSize: '10rem'}}/>
            </div>
            <div className="details">
                <h2 className="name">{product.name}</h2>
                <p className="code">{product.code}</p>
                <p className="price">{product.price.amount} {product.price.currency}</p>
            </div>
            <table className="table">
                <thead>
                <tr>
                    <td>Size</td>
                    <td>Store</td>
                    <td>Ordered</td>
                    <td>Warehouse</td>
                    <td>Delivery Time</td>
                    <td>Stock Level</td>
                </tr>
                </thead>
                <tbody>
                {product.items.map((item, index) => {
                    const itemStoreStock = item.stock.find(stock => stock.location === 'store');
                    const itemOrderedStock = item.stock.find(stock => stock.location === 'ordered');
                    const progressBarColor = itemStoreStock?.amount >= itemStoreStock?.threshold ? 'green' : 'orange';
                    const progressBarStoreFill = (itemStoreStock?.amount / itemStoreStock?.target) * 100;
                    const progressBarOrderedFill = ((itemOrderedStock?.amount) / itemStoreStock?.target) * 100;

                    return (
                    <tr key={index}>
                    <td>{item.size}</td>
                    <td>{item.stock.find(stock => stock.location === 'store')?.amount ?? 0}</td>
                    <td>{item.stock.find(stock => stock.location === 'ordered')?.amount ?? 0}</td>
                    <td>{item.stock.find(stock => stock.location === 'warehouse')?.amount ?? 0}</td>
                    <td>{item.delivery_time.amount}</td>
                    <td>
                        <div className={bar_styles['progress-bar-container']}>
                        <div className={bar_styles['progress-bar-reference']}>
                            <div className={bar_styles['progress-bar-level']} style={{ background: progressBarColor, width: `${progressBarStoreFill}%` }}></div>
                            <div className={bar_styles['progress-bar-ordered']} style={{ width: `${progressBarOrderedFill}%` }}></div>
                        </div>
                        <span className={bar_styles['progress-bar-label']}>{itemStoreStock?.target}</span>
                        </div>
                    </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
            <div className={bar_styles['progress-bar-container']}>
                <div className={bar_styles['progress-bar-reference']}>
                    <div className={bar_styles['progress-bar-level']} style={{ background: totalProgressBarColor, width: `${totalProgressBarStoreFill}%` }}></div>
                    <div className={bar_styles['progress-bar-ordered']} style={{ width: `${totalProgressBarOrderedFill}%` }}></div>
                </div>
                <span className={bar_styles['progress-bar-label']}>100</span>
            </div>
            <button onClick={handleOpenPopup}>Open Popup</button>
            {showPopup && <Popup product={product} onClose={handleClosePopup} />}
        </div>

    );
}

export async function getServerSideProps(context) {
    try {
        const { req, params } = context;
        const client = await clientPromise;
        const db = client.db("interns_mongo_retail");

        const product = await db
            .collection("products")
            .findOne({ _id: ObjectId(params._id)});

        return {
            props: { product: JSON.parse(JSON.stringify(product)) },
        };
    } catch (e) {
        console.error(e);
        return { props: {ok: false, reason: "Server error"}};
    }
}