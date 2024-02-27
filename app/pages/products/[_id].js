import React, { useState, useEffect, useRef, useContext } from 'react';
import  *  as  Realm  from  "realm-web";
import clientPromise from '../../lib/mongodb';
import { useRouter } from 'next/router';
import { ObjectId } from "bson";
import { ServerContext } from '../_app';
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShirt } from '@fortawesome/free-solid-svg-icons';
import { FaTshirt, FaWhmcs } from 'react-icons/fa';
import styles from '../../styles/product.module.css';
import Popup from '../../components/ReplenishmentPopup';
import StockLevelBar from '../../components/StockLevelBar';

export default function Product({ preloadedProduct, baseUrl, dashboardId }) {
    
    const [product, setProduct] = useState(preloadedProduct);
    const [showPopup, setShowPopup] = useState(false);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
    const [imageError, setImageError] = useState(false);

    const router = useRouter();
    const { location } = router.query;

    const utils = useContext(ServerContext);

    const  app = new  Realm.App({ id: utils.appServiceInfo.appId });

    const lightColors = [
        '#B1FF05','#E9FF99','#B45AF2','#F2C5EE',
        '#00D2FF','#A6FFEC', '#FFE212', '#FFEEA9'
    ];

    const leafUrl = lightColors.includes(product.color?.hex) ? "/images/leaf_dark.png" : "/images/leaf_white.png";

    const productFilter = {'items.product.id': ObjectId(preloadedProduct._id)};
    let locationFilter = {};
    //Add location filter if exists
    if (location) {
        locationFilter= { 'location.destination.id': ObjectId(location)};
    }
    
    const sdk = new ChartsEmbedSDK({ baseUrl: baseUrl});
    const dashboardDiv = useRef(null);
    const [rendered, setRendered] = useState(false);
    const [dashboard] = useState(sdk.createDashboard({ 
        dashboardId: dashboardId, 
        filter: { $and: [productFilter, locationFilter]},
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
            const collection = mongodb.db(utils.dbInfo.dbName).collection("products");
            let updatedProduct = null;
            
            const filter = {
                filter: {
                    operationType: "update",
                    "fullDocument._id": new ObjectId(preloadedProduct._id)
                }
            };

            for await (const  change  of  collection.watch(filter)) {
                if (location) {
                    updatedProduct = change.fullDocument;
                } else {
                    updatedProduct = await mongodb
                        .db(utils.dbInfo.dbName)
                        .collection("products_area_view")
                        .findOne({ _id: ObjectId(preloadedProduct._id)});
                }
                
                setProduct(JSON.parse(JSON.stringify(updatedProduct)));
            }
        }
        login();
    }, []);

    useEffect(() => {
        setProduct(preloadedProduct);
        if (rendered) {
            dashboard.setFilter({ $and: [productFilter, locationFilter]});
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
              const response = await fetch(utils.apiInfo.dataUri + '/action/updateOne', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': 'Bearer ' + utils.apiInfo.accessToken,
                },
                body: JSON.stringify({
                  dataSource: 'mongodb-atlas',
                  database: utils.dbInfo.dbName,
                  collection: 'products',
                  filter: { "_id": { "$oid": preloadedProduct._id } },
                  update: {
                    "$set": { "autoreplenishment": !product.autoreplenishment }
                  }
                }),
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
            <div className={styles["image-container"]}>
            {
                imageError ? 
                    (
                        utils.demoInfo.industry == 'manufacturing' ?
                            (
                                <FaWhmcs color="grey" className={styles["default-icon"]}/>
                            ) :
                            (
                                <>
                                    <FaTshirt color={product.color?.hex} className={styles["default-icon"]} />
                                    <img src={leafUrl} alt="Leaf" className={styles["leaf"]}/>
                                </>
                            )
                    ) :
                    (
                        <img 
                            src={product.image?.url ? product.image?.url : "default"} 
                            alt="Product Image" 
                            className={styles["product-image"]}
                            onError={() => setImageError(true)}
                        />
                    )
            }
            </div>
            <div className={styles["details"]}>
                <p className="name">{product.name}</p>
                <p className="price">{product.price?.amount} {product.price?.currency}</p>
                <p className="code">{product.code}</p>
                {<StockLevelBar stock={product.total_stock_sum} locationId={location} />}
                {location && (<div className={styles["switch-container"]}>
                    <span className={styles["switch-text"]}>Autoreplenishment</span>
                    <label className={styles["switch"]}>
                        <input type="checkbox" checked={product.autoreplenishment} onChange={handleToggleAutoreplenishment}/>
                        <span className={styles["slider"]}></span>
                    </label>
                </div>)}
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
                    <td>{item.name}</td>
                    <td>{item.stock.find(stock => stock.location.id === location)?.amount ?? 0}</td>
                    <td>{item.stock.find(stock => stock.location.id === location)?.ordered ?? 0}</td>
                    <td>{item.stock.find(stock => stock.location.type === 'warehouse')?.amount ?? 0}</td>
                    <td>{item.delivery_time.amount} {item.delivery_time.unit}</td>
                    <td>
                        {<StockLevelBar stock={item.stock} locationId={location}/>}
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
            {location && (<button onClick={handleOpenPopup}>REPLENISH STOCK</button>)}
            </div>
        </div>
        <div className={styles["dashboard"]} ref={dashboardDiv}/>
        
        {showPopup && <Popup 
            product={product} 
            onClose={handleClosePopup} 
            onSave={handleSave}
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
        const baseUrl = process.env.CHARTS_EMBED_SDK_BASEURL;
        const dashboardId = process.env.DASHBOARD_ID_PRODUCT;

        const client = await clientPromise;
        const db = client.db(dbName);

        const { params, query } = context;
        const locationId = query.location;

        const collectionName = locationId ? "products" : "products_area_view";
        
        const product = await db
            .collection(collectionName)
            .findOne({ _id: ObjectId(params._id)});
        return {
            props: { preloadedProduct: JSON.parse(JSON.stringify(product)), baseUrl: baseUrl, dashboardId: dashboardId },
        };
    } catch (e) {
        console.error(e);
        return { props: {ok: false, reason: "Server error"}};
    }
}