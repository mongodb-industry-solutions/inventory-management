import React, { useState, useEffect, useRef } from 'react';
import  *  as  Realm  from  "realm-web";
import clientPromise from '../../lib/mongodb';
import { useRouter } from 'next/router';
import { ObjectId } from "bson"
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShirt } from '@fortawesome/free-solid-svg-icons';
import styles from '../../styles/product.module.css';
import Popup from '../../components/ReplenishmentPopup';
import StockLevelBar from '../../components/StockLevelBar';

export default function Product({ preloadedProduct, realmAppId, baseUrl, dashboardId, databaseName }) {
    
    const [product, setProduct] = useState(preloadedProduct);
    const [showPopup, setShowPopup] = useState(false);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
    const  app = new  Realm.App({ id: realmAppId });

    const router = useRouter();
    const { store } = router.query;

    const lightColors = [
        '#B1FF05','#E9FF99','#B45AF2','#F2C5EE',
        '#00D2FF','#A6FFEC', '#FFE212', '#FFEEA9'
    ];

    const leafUrl = lightColors.includes(product.color.hex) ? "/images/leaf_dark.png" : "/images/leaf_white.png";

    const productFilter = {'items.product.id': ObjectId(preloadedProduct._id)};
    let storeFilter = {};
    //Add store filter if exists
    if (store) {
        storeFilter= { 'location.destination.id': ObjectId(store)};
    }
    
    const sdk = new ChartsEmbedSDK({ baseUrl: baseUrl});
    const dashboardDiv = useRef(null);
    const [rendered, setRendered] = useState(false);
    const [dashboard] = useState(sdk.createDashboard({ 
        dashboardId: dashboardId, 
        filter: { $and: [productFilter, storeFilter]},
        widthMode: 'scale', 
        heightMode: 'scale', 
        background: '#fff'
    }));

    useEffect(() => {
        dashboard.render(dashboardDiv.current)
            .then(() => setRendered(true))
            .catch(err => console.log("Error during Charts rendering.", err));
      }, [dashboard]);
    

    useEffect(() => {
        const  login = async () => {
        
            await app.logIn(Realm.Credentials.anonymous());
            const mongodb = app.currentUser.mongoClient("mongodb-atlas");
            const collection = mongodb.db(databaseName).collection("products");
            let updatedProduct = null;
            
            const filter = {
                filter: {
                    operationType: "update",
                    "fullDocument._id": new ObjectId(preloadedProduct._id)
                }
            };

            for await (const  change  of  collection.watch(filter)) {
                updatedProduct = JSON.parse(JSON.stringify(change.fullDocument));
                setProduct(updatedProduct);
            }
        }
        login();
    }, []);

    useEffect(() => {
        if (rendered) {
            dashboard.setFilter({ $and: [productFilter, storeFilter]});
            dashboard.refresh();
        }
    }, [router.asPath]);

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
                <div className={styles["icon-container"]}>
                <FontAwesomeIcon id="tshirt" icon={faShirt} style={{ color: product.color.hex, fontSize: '10rem', backgroundColor: 'rgb(249, 251, 250)', padding: '15px'}}/>
                <img src={leafUrl} alt="Leaf" className={styles["leaf"]}/>
                </div>
            </div>
            <div className={styles["details"]}>
                <p className="name">{product.name}</p>
                <p className="price">{product.price.amount} {product.price.currency}</p>
                <p className="code">{product.code}</p>
                {<StockLevelBar stock={product.total_stock_sum} storeId={store} />}
                <div className={styles["switch-container"]}>
                    <span className={styles["switch-text"]}>Autoreplenishment</span>
                    <label className={styles["switch"]}>
                        <input type="checkbox" checked={product.autoreplenishment} onChange={handleToggleAutoreplenishment}/>
                        <span className={styles["slider"]}></span>
                    </label>
                </div>
            </div>
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
                    <td>{item.stock.find(stock => stock.location.id === store)?.amount ?? 0}</td>
                    <td>{item.stock.find(stock => stock.location.id === store)?.ordered ?? 0}</td>
                    <td>{item.stock.find(stock => stock.location.type === 'warehouse')?.amount ?? 0}</td>
                    <td>{item.delivery_time.amount} {item.delivery_time.unit}</td>
                    <td>
                        {<StockLevelBar stock={item.stock} storeId = {store}/>}
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
        
        {showPopup && <Popup 
            product={product} 
            onClose={handleClosePopup} 
            onSave={handleSave} 
            storeId={store}
        />}
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
        if (!process.env.REALM_APP_ID) {
            throw new Error('Invalid/Missing environment variables: "REALM_APP_ID"')
        }
        if (!process.env.CHARTS_EMBED_SDK_BASEURL) {
            throw new Error('Invalid/Missing environment variables: "CHARTS_EMBED_SDK_BASEURL"')
        }
        if (!process.env.DASHBOARD_ID_GENERAL) {
            throw new Error('Invalid/Missing environment variables: "DASHBOARD_ID_GENERAL"')
        }
        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;
        const realmAppId = process.env.REALM_APP_ID;
        const baseUrl = process.env.CHARTS_EMBED_SDK_BASEURL;
        const dashboardId = process.env.DASHBOARD_ID_PRODUCT;

        const { req, params } = context;
        const client = await clientPromise;
        const db = client.db(dbName);

        const product = await db
            .collection("products")
            .findOne({ _id: ObjectId(params._id)});

        return {
            props: { preloadedProduct: JSON.parse(JSON.stringify(product)), realmAppId: realmAppId, baseUrl: baseUrl, dashboardId: dashboardId, databaseName: dbName },
        };
    } catch (e) {
        console.error(e);
        return { props: {ok: false, reason: "Server error"}};
    }
}