import React, { useState, useEffect, useRef } from 'react';
import  *  as  Realm  from  "realm-web";
import clientPromise from '../../lib/mongodb';
import { ObjectId } from "bson"
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShirt } from '@fortawesome/free-solid-svg-icons';

import styles from '../../styles/product.module.css';
import Popup from '../../components/ReplenishmentPopup';
import StockLevelBar from '../../components/StockLevelBar';
import { set } from 'lodash';

const  app = new  Realm.App({ id:  "interns-mongo-retail-app-nghfn"});

export default function Product({ preloadedProduct }) {
    
    const [product, setProduct] = useState(preloadedProduct);
    const [showPopup, setShowPopup] = useState(false);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
    
    const sdk = new ChartsEmbedSDK({ baseUrl: 'https://charts.mongodb.com/charts-jeffn-zsdtj' });
    const dashboardDiv = useRef(null);
    const [rendered, setRendered] = useState(false);
    const [dashboard] = useState(sdk.createDashboard({ 
        dashboardId: '64b518b0-a789-4f02-8764-b33d0c08bc61', 
        filter: {'items.product.id': ObjectId(preloadedProduct._id)},
        widthMode: 'scale', 
        heightMode: 'scale', 
        background: '#fff'
    }));

    useEffect(() => {
        dashboard.render(dashboardDiv.current).then(() => setRendered(true)).catch(err => console.log("Error during Charts rendering.", err));
      }, [dashboard]);
    

    useEffect(() => {
        const  login = async () => {
        
            await app.logIn(Realm.Credentials.anonymous());
            const mongodb = app.currentUser.mongoClient("mongodb-atlas");
            const collection = mongodb.db("interns_mongo_retail").collection("products");
            let updatedProduct = null;
            
            for await (const  change  of  collection.watch({ $match: { 'fullDocument._id': preloadedProduct._id } })) {
                updatedProduct = change.fullDocument;
                updatedProduct._id = updatedProduct._id.toString();

                if( updatedProduct._id === preloadedProduct._id) {
                    setProduct(updatedProduct);
                }
            }
        }
        login();
    }, []);

    const handleOpenPopup = () => {
        setShowPopup(true);
    };

    const handleClosePopup = () => {
        setShowPopup(false);
        dashboard.refresh();
    };

    const handleSave = async () => {
        setSaveSuccessMessage(true);
        await new Promise((resolve) => setTimeout(resolve, 4000));
        setSaveSuccessMessage(false);
      };

    const handleToggleAutoreplenishment = async () => {
        try {
            const response = await fetch(`/api/setAutoreplenishment?product_id=${preloadedProduct._id}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(!product.autoreplenishment),
              });
            if (response.ok) {
                console.log('Autoreplenishment toggled successfully');
            } else {
                console.log('Error toggling autoreplenishment');
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <>
        <div className="content">
        <div className={styles['product-detail-content']}>
            <div className={styles['icon']}>
                <FontAwesomeIcon id="tshirt" icon={faShirt} style={{ color: product.color.hex, fontSize: '10rem', backgroundColor: 'rgb(249, 251, 250)', padding: '15px'}}/>
            </div>
            <div className={styles["details"]}>
                <p className="name">{product.name}</p>
                <p className="price">{product.price.amount} {product.price.currency}</p>
                <p className="code">{product.code}</p>
                {<StockLevelBar stock={product.total_stock_sum} />}
            </div>
            <label className={styles["switch"]}>
                <input type="checkbox" checked={product.autoreplenishment} onChange={handleToggleAutoreplenishment}/>
                <span className={styles["slider"]}></span>
            </label>
            <div className={styles["table"]}>
            <table>
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
                {product.items.map((item, index) => (
                    <tr key={index}>
                    <td>{item.size}</td>
                    <td>{item.stock.find(stock => stock.location === 'store')?.amount ?? 0}</td>
                    <td>{item.stock.find(stock => stock.location === 'ordered')?.amount ?? 0}</td>
                    <td>{item.stock.find(stock => stock.location === 'warehouse')?.amount ?? 0}</td>
                    <td>{item.delivery_time.amount} {item.delivery_time.unit}</td>
                    <td>
                        {<StockLevelBar stock={item.stock} />}
                    </td>
                    </tr>
                    ))}
                </tbody>
            </table>
            <div className={styles["legend"]}>
                <span className={`${styles["circle"]} ${styles["full"]}`}></span> <span>Full</span> &nbsp;&nbsp;
                <span className={`${styles["circle"]} ${styles["low"]}`}></span> <span>Low</span> &nbsp;&nbsp;
                <span className={`${styles["circle"]} ${styles["ordered"]}`}></span> <span>Ordered</span>
            </div>
            <button onClick={handleOpenPopup}>REPLENISH STOCK</button>
            </div>
        </div>
        <div className={styles["dashboard"]} ref={dashboardDiv}/>
        
        {showPopup && <Popup product={product} onClose={handleClosePopup} onSave={handleSave}/>}
        {saveSuccessMessage && (
            <div style={{ position: 'fixed', bottom: 34, right: 34, background: '#00684bc4', color: 'white', padding: '10px', animation: 'fadeInOut 0.5s'}}>
                Order placed successfully
            </div>
        )}
        </div>
        </>

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
            props: { preloadedProduct: JSON.parse(JSON.stringify(product)) },
        };
    } catch (e) {
        console.error(e);
        return { props: {ok: false, reason: "Server error"}};
    }
}