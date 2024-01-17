import { useState, useEffect } from 'react';
import  *  as  Realm  from  "realm-web";
import clientPromise from "../lib/mongodb";

import ProductBox from "../components/ProductBox";
import StockLevelBar from "../components/StockLevelBar";

import styles from "../styles/control.module.css";

export default function Control({ preloadedProducts, stores, realmAppId, databaseName }) { 
    
    const [products, setProducts] = useState(preloadedProducts);
    const [isSelling, setIsSelling] = useState(false); // State to keep track of sale status
    const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
    const [selectedStore, setSelectedStore] = useState('');
    const [onlineToInStoreRatio, setOnlineToInStoreRatio] = useState(0.5);

    const  app = new  Realm.App({ id: realmAppId });

    useEffect(() => {
        // Start or stop selling based on the isSelling state
        if (isSelling) {
        const saleInterval = setInterval(performRandomSale, 5000); // 5 seconds in milliseconds
        return () => clearInterval(saleInterval);
        }
    }, [isSelling]);

    useEffect(() => {
        const  login = async () => {
        
            await app.logIn(Realm.Credentials.anonymous());
            const mongodb = app.currentUser.mongoClient("mongodb-atlas");
            const collection = mongodb.db(databaseName).collection("products");

            for await (const  change  of  collection.watch()) {

                const updatedProduct = change.fullDocument;
                updatedProduct._id = updatedProduct._id.toString();

                setProducts((prevProducts) => {
                    const updatedIndex = prevProducts.findIndex((product) => product._id === updatedProduct._id);
                    if (updatedIndex !== -1) {
                        const updatedProducts = [...prevProducts];
                        updatedProducts[updatedIndex] = updatedProduct;
                        return updatedProducts;
                    } else {
                        return prevProducts;
                    }
                });
            }
        }
        login();
    }, []);

    const handleStoreChange = (store) => {
        setSelectedStore(store.target.value);
    };

    const handleRatioChange = (event) => {
        // Validate that the entered value is between 0 and 1
        const newValue = event.target.value;
        if (!isNaN(newValue) && newValue >= 0 && newValue <= 1) {
          setOnlineToInStoreRatio(newValue);
        }
      };

     // Function to handle the button click to start or stop sales
    const handleSaleButtonClick = () => {
        setIsSelling((prevIsSelling) => !prevIsSelling); // Toggle the sale status
    };

    const performRandomSale = async () => {
        const colors = [...new Set(products.map((product) => product.color.name))];
        const sizes = [...new Set(products.flatMap((product) => product.items.map((item) => item.size)))];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
        const randomQuantity = Math.floor(Math.random() * 5) + 1;
        const randomChannel = Math.random() < onlineToInStoreRatio ? 'online' : 'in-store';
        var store_id = '';
        var store_name = '';

        if (!selectedStore && stores.length > 0) {
            const randomIdx = Math.floor(Math.random() * stores.length);
            store_id = stores[randomIdx]._id;
            store_name = stores[randomIdx].name;
        } else {
            store_id = selectedStore;
            store_name = stores.find(store => store._id === selectedStore).name;
        }
    
        try {
        // Perform the sale using await and Promise
        const result = await new Promise((resolve, reject) => {
            fetch(`/api/simulateSale?color=${randomColor}&size=${randomSize}&quantity=${randomQuantity}&store_id=${store_id}&store_name=${store_name}&channel=${randomChannel}`)
            .then((response) => response.json())
            .then((data) => resolve(data))
            .catch((error) => reject(error));
        });
    
        console.log(result.message);
        } catch (error) {
        console.error(error);
        }
    };

    /* 
        Mode: 
            normal - reset stock levels following a normal distribution
            target - reset stock levels to target
            threshold - reset stock levels to threshold
            custom - reset stock levels to custom values
    */
    const handleUpdateStock = (product, item, customAmount, mode) => {
        setProducts((prevProducts) => {
            const productIndex = prevProducts.findIndex((p) => p._id === product._id);
            if (productIndex === -1) {
              // Product not found, return the previous list unchanged
              return prevProducts;
            }
        
            // Create a new copy of the products array to avoid mutating the original state
            const updatedProducts = [...prevProducts];
            const productToUpdate = { ...updatedProducts[productIndex] };

            const initialIndex = mode === 'custom' ? productToUpdate.items.findIndex((i) => i.sku === item?.sku) : 0;
            const itemsLength = mode === 'custom' ? initialIndex + 1 : productToUpdate.items.length;

            let amount = null;

            switch (mode) {
                case 'custom':
                    amount = customAmount;
                    break;
                case 'target':
                    amount = 20;
                    break;
                case 'threshold':
                    amount = 10;
                    break;
            }

            for(let i = initialIndex; i < itemsLength; i++) {

                const locationIndex = productToUpdate.items[i].stock.findIndex(
                    (loc) => loc.location === "store"
                );
                
                if(mode === 'normal'){
                    switch (product.items[i].size) {
                        case 'XS':
                            amount = 15;
                            break;
                        case 'S':
                            amount = 10;
                            break;
                        case 'M':
                            amount = 5;
                            break;
                        case 'L':
                            amount = 10;
                            break;
                        case 'XL':
                            amount = 15;
                            break;
                        default:
                            amount = 10;
                    }
                }

                // Calculate the difference between the new and previous amounts
                const prevAmount = prevProducts[productIndex].items[i].stock[locationIndex].amount;
                const difference = amount - prevAmount;
            
                // Update the amount for the specific location
                productToUpdate.items[i].stock[locationIndex].amount = amount;
                
                // Update the total_stock_sum attribute with the difference
                const totalStockLocationIndex = productToUpdate.total_stock_sum.findIndex(
                    (loc) => loc.location === "store"
                );
                if (totalStockLocationIndex !== -1) {
                    productToUpdate.total_stock_sum[totalStockLocationIndex].amount += difference;
                }
            }

            // Update the product in the products array
            updatedProducts[productIndex] = productToUpdate;
        
            return updatedProducts;
          });
    };

    const handleResetDemo = async (productIdList) => {
        try {
            const response = await fetch('/api/resetDemo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productIdList),
                });
                if (response.ok) {
                    console.log('Product reset successfully');
                    setSaveSuccessMessage(true);
                    await new Promise((resolve) => setTimeout(resolve, 4000));
                    setSaveSuccessMessage(false);
                } else { 
                    console.log('Error resetting product stock');
                }
        }
        catch (e) {
            console.error(e);
        }
    };

    const handleSave = async (product) => {
        try {
            const response = await fetch('/api/updateProductStock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(product),
                });
                if (response.ok) {
                    console.log('Product stock saved successfully');
                    setSaveSuccessMessage(true);
                    await new Promise((resolve) => setTimeout(resolve, 4000));
                    setSaveSuccessMessage(false);
                } else { 
                    console.log('Error saving updated product stock');
                }
        }
        catch (e) {
            console.error(e);
        }
    };

    return (
        <>
        <div className="content">
                <h1>Control Panel</h1>
                <div className="button-container">
        <button className="sale-button" onClick={handleSaleButtonClick}>
          {isSelling ? "Stop Selling" : "Start Selling"}
        </button>
        <select id="storeDropdown" value={selectedStore} disabled={isSelling} onChange={handleStoreChange}>
            <option value={''}>All</option>
            {stores.map(store => (
                <option key={store._id} value={store._id}>
                    {store.name}
                </option>
            ))}
        </select>
        <label htmlFor="ratioInput">Online to In-store Ratio:</label>
        <input
            type="number"
            id="ratioInput"
            value={onlineToInStoreRatio}
            disabled={isSelling}
            onChange={handleRatioChange}
            min="0"
            max="1"
            step="0.1"
        />

        </div>
                <div className={styles["catalog"]}>
                <button 
                        className={styles["reset-demo-button"]}
                        onClick={() => handleResetDemo(products.map((product) => product._id))}
                    >
                        RESET ALL
                    </button>
                    <h2>Product Catalog</h2>
                    <div className={styles["table-wrapper"]}>
                        <table className={styles["product-table"]}>
                        <tbody>
                        {products.map((product, index) => (
                            <tr key={index}>
                            <td className={styles["product-cell"]}>
                               <ProductBox key={product._id} product={product}/>
                               {<StockLevelBar stock={product.total_stock_sum} />}
                            </td>
                            <td>
                                <div className={styles["item-table-wrapper"]}>
                                    <button 
                                        className={styles["reset-button"]} 
                                        onClick={() => handleUpdateStock(product, {}, 0,'normal')}
                                    >
                                        Reset Stock Normal
                                    </button>
                                    <button 
                                        className={styles["reset-button"]} 
                                        onClick={() => handleUpdateStock(product, {}, 0,'target')}
                                    >
                                        Reset Stock Target
                                    </button>
                                    <button 
                                        className={styles["reset-button"]} 
                                        onClick={() => handleUpdateStock(product, {}, 0,'threshold')}
                                    >
                                        Reset Stock Threshold
                                    </button>
                                    <table className={styles["item-table"]}>
                                    <thead>
                                        <tr>
                                            <td>Size</td>
                                            <td>Stock</td>
                                            <td>Threshold</td>
                                            <td>Target</td>
                                            <td>Stock Level</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {product.items.map((item, itemIndex) => (
                                        <tr key={itemIndex}>
                                            <td>{item.size}</td>
                                            <td>
                                                <select defaultValue={item?.stock.find(stock => stock.location === 'store')?.amount ?? 0} onChange={(e) => handleUpdateStock(product, item, parseInt(e.target.value),'custom')}>
                                                {[...Array(item?.stock.find((stock) => stock.location === 'store')?.target + 1).keys()].map((value) => (
                                                    <option key={value} value={value}>{value}</option>
                                                ))}
                                                </select>
                                            </td>
                                            <td>
                                                {item?.stock.find(stock => stock.location === 'store')?.threshold ?? 0}
                                            </td>
                                            <td>
                                                {item?.stock.find(stock => stock.location === 'store')?.target ?? 0}
                                            </td>
                                            <td>
                                                {<StockLevelBar stock={item?.stock} />}
                                            </td>
                                        </tr>
                                        
                                        ))}
                                    </tbody>
                                    </table>
                                    <button 
                                        className={styles["save-button"]}
                                        onClick={() => handleSave(product)} 
                                    >
                                        SAVE
                                    </button>
                                </div>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                        </table>
                    </div>
                </div>
                {saveSuccessMessage && (
                    <div style={{ position: 'fixed', bottom: 34, right: 34, background: '#00684bc4', color: 'white', padding: '10px', animation: 'fadeInOut 0.5s'}}>
                        Stock reset successfully
                    </div>
                )}
        </div>
        </>
    );
}

export async function getServerSideProps() {
    try {
        if (!process.env.REALM_APP_ID) {
            throw new Error('Invalid/Missing environment variables: "REALM_APP_ID"')
        }
        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;
        const realmAppId = process.env.REALM_APP_ID;

        const client = await clientPromise;
        const db = client.db(dbName);

        const products = await db
            .collection("products")
            .find({})
            .toArray();
        
        const stores = await db
            .collection("stores")
            .find({})
            .toArray();

        return {
            props: { preloadedProducts: JSON.parse(JSON.stringify(products)), stores: JSON.parse(JSON.stringify(stores)), realmAppId: realmAppId, databaseName: dbName },
        };
    } catch (e) {
        console.error(e);
        return { props: {ok: false, reason: "Server error"}};
    }
}