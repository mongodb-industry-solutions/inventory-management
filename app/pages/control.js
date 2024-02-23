import { useState, useEffect, useContext  } from 'react';
import  *  as  Realm  from  "realm-web";
import clientPromise from "../lib/mongodb";
import { ServerContext } from './_app';
import ProductBox from "../components/ProductBox";
import StockLevelBar from "../components/StockLevelBar";

import styles from "../styles/control.module.css";

export default function Control({ preloadedProducts, locations, realmAppId, databaseName }) { 
    
    const [products, setProducts] = useState(preloadedProducts);
    const [isSelling, setIsSelling] = useState(false); // State to keep track of sale status
    const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [onlineToInPersonRatio, setOnlineToInPersonRatio] = useState(0.5);

    const  app = new  Realm.App({ id: realmAppId });

    const utils = useContext(ServerContext);

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

            const filter = {filter: {operationType: "update"}};

            for await (const  change  of  collection.watch(filter)) {

                const updatedProduct = JSON.parse(JSON.stringify(change.fullDocument));

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

    const handleLocationChange = (location) => {
        setSelectedLocation(location.target.value);
    };

    const handleRatioChange = (event) => {
        // Validate that the entered value is between 0 and 1
        const newValue = event.target.value;
        if (!isNaN(newValue) && newValue >= 0 && newValue <= 1) {
          setOnlineToInPersonRatio(newValue);
        }
      };

     // Function to handle the button click to start or stop sales
    const handleSaleButtonClick = () => {
        setIsSelling((prevIsSelling) => !prevIsSelling); // Toggle the sale status
    };

    const performRandomSale = async () => {

        // Select a location
        var locationId;
        if (!selectedLocation && locations.length > 0) {
            locationId = locations[Math.floor(Math.random() * locations.length)]._id;
        } else {
            locationId = selectedLocation;
        }

        // Select random product
        const availableProducts = products.filter(product =>
            product.items.some(item =>
                item.stock.some(stockItem =>
                  stockItem.location.id === locationId 
                  && stockItem.amount > 0
                )
            )
        );

        if (availableProducts.length === 0) {
            console.log('No available products for the selected location.');
            return;
        }

        const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];

        // Select a random item
        const availableItems = randomProduct.items.filter(item =>
            item.stock.some(stockItem =>
                stockItem.location.id === locationId
                && stockItem.amount > 0
            )
        );
        
        if (availableItems.length === 0) {
            console.log('No available items for the selected location in the chosen product.');
            return;
        }
        const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];

        // Select a random amount
        const availableStock = randomItem.stock.find(
            stockItem => stockItem.location.id === locationId
        ).amount;
        const randomAmount = Math.floor(Math.random() * (availableStock / 4)) + 1;

        // Select a random channel
        const randomChannel = Math.random() < onlineToInPersonRatio ? 'online' : 'in-person';

        // Create new transaction
        const transaction = {
            type: 'outbound',
            //user_id:  selectedUser?._id,
            location: {
                origin: {
                    type: locations.find(location => location._id === locationId).type,
                    id: locationId,
                    name: locations.find(location => location._id === locationId).name,
                    area_code: locations.find(location => location._id === locationId).area.code
                },
                destination: {
                    type: 'customer'
                }
            },
            channel: randomChannel,
            placement_timestamp: '',
            items: []
        };

        var newItem = structuredClone(randomItem);
        delete newItem.stock;
        newItem.status = [];
        newItem.amount = -randomAmount;
        newItem.product = {
            id: randomProduct._id,
            name: randomProduct.name
        };

        transaction.items.push(newItem);
    
        try {
            const response = await fetch(utils.apiInfo.httpsUri + '/addTransaction', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(transaction),
              });
            if (response.ok) {
                console.log('Transaction saved successfully');
            } else {
                console.log('Error saving transaction');
            }
        } catch (error) {
            console.error(error);
        }
    };

    /* 
        Mode: 
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
                    (loc) => loc.location.id === selectedLocation
                );

                // Calculate the difference between the new and previous amounts
                const prevAmount = prevProducts[productIndex].items[i].stock[locationIndex].amount;
                const difference = amount - prevAmount;
            
                // Update the amount for the specific location
                productToUpdate.items[i].stock[locationIndex].amount = amount;
                
                // Update the total_stock_sum attribute with the difference
                const totalStockLocationIndex = productToUpdate.total_stock_sum.findIndex(
                    (loc) => loc.location.id === selectedLocation
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

    const handleResetDemo = async () => {
        try {
            const response = await fetch('/api/resetDemo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
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
            const response = await fetch(utils.apiInfo.httpsUri + `/updateProductStock?location_id=${selectedLocation}`, {
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
        <select value={selectedLocation} disabled={isSelling} onChange={handleLocationChange}>
            <option value={''}>All</option>
            {locations.map(location => (
                <option key={location._id} value={location._id}>
                    {location.name}
                </option>
            ))}
        </select>
        <label htmlFor="ratioInput">Online to In-person Ratio:</label>
        <input
            type="number"
            id="ratioInput"
            value={onlineToInPersonRatio}
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
                        onClick={() => handleResetDemo()}
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
                               {<StockLevelBar stock={product.total_stock_sum} locationId={selectedLocation} />}
                            </td>
                            <td>
                                <div className={styles["item-table-wrapper"]}>
                                    <button 
                                        className={styles["reset-button"]} 
                                        disabled={!selectedLocation}
                                        onClick={() => handleUpdateStock(product, {}, 0,'target')}
                                    >
                                        Reset Stock Target
                                    </button>
                                    <button 
                                        className={styles["reset-button"]} 
                                        disabled={!selectedLocation}
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
                                                <select 
                                                    value={item?.stock.find(stock => stock.location.id === selectedLocation)?.amount ?? 0} 
                                                    onChange={(e) => handleUpdateStock(product, item, parseInt(e.target.value),'custom')}>
                                                    {[...Array((item?.stock.find((stock) => stock.location.id === selectedLocation)?.target ?? 0) + 1).keys()].map((value) => (
                                                        <option key={value} value={value}>{value}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                {item?.stock.find(stock => stock.location.id === selectedLocation)?.threshold ?? 0}
                                            </td>
                                            <td>
                                                {item?.stock.find(stock => stock.location.id === selectedLocation)?.target ?? 0}
                                            </td>
                                            <td>
                                                {<StockLevelBar stock={item?.stock} locationId={selectedLocation}/>}
                                            </td>
                                        </tr>
                                        
                                        ))}
                                    </tbody>
                                    </table>
                                    <button 
                                        className={styles["save-button"]}
                                        disabled={!selectedLocation}
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
        
        const locations = await db
            .collection("locations")
            .find({})
            .toArray();

        return {
            props: { preloadedProducts: JSON.parse(JSON.stringify(products)), locations: JSON.parse(JSON.stringify(locations)), realmAppId: realmAppId, databaseName: dbName },
        };
    } catch (e) {
        console.error(e);
        return { props: {ok: false, reason: "Server error"}};
    }
}