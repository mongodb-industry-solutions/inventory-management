import clientPromise from "../lib/mongodb";
import { useState } from 'react';
import ProductBox from "../components/ProductBox";
import StockLevelBar from "../components/StockLevelBar";
import styles from "../styles/control.module.css";

export default function Control({ products }) { 
    
    const [cartItems, setCartItems] = useState([]);

    const handleAddToCart = (product, item, amount) => {
        const itemIndex = cartItems.findIndex((cartItem) => cartItem.sku === item.sku);

        if (amount === 0) { //remove
            if (itemIndex !== -1) {
                const updatedCart = [...cartItems];
                updatedCart.splice(itemIndex, 1);
                setCartItems(updatedCart);
            }
        }
        else { 
            if (itemIndex !== -1) { //update
                setRows((prevCartItems) =>
                    prevCartItems.map((cartItem, i) => (cartItem.sku === item.sku ? { ...cartItem, amount: amount } : cartItem))
                );
            } else { //add
                const itemToAdd = { 
                    sku: item.sku,
                    productId: product._id,
                    productName: product.name,
                    size: item.size,
                    amount: amount
                };
                setCartItems((prevCart) => [...prevCart, itemToAdd]);
            }
        }
      };

      const handleClearCartItem = (productId) => {
        const updatedCart = cartItems.filter((item) => item.productId !== productId);
        setCartItems(updatedCart);
      };

      const handleClearAll = () => {
        setCartItems([]);
      };

      const handleResetProductStock = async (productId) => {
        try {
            const response = await fetch('/api/resetProductStock', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productId }),
              });
              if (response.ok) {
                console.log('Order saved successfully');
              } else { 
                console.log('Error reseting product stock');
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
                <div className={styles["container"]}>
                <div className={styles["catalog"]}>
                    <h2>Catalog</h2>
                    <button className={styles["reset-all-button"]}>Reset All</button>
                    <div className={styles["table-wrapper"]}>
                        <table className={styles["product-table"]}>
                        <tbody>
                        {products.map((product, index) => (
                            <tr key={index}>
                            <td className={styles["product-cell"]}>
                                <ProductBox key={product._id} product={product}/>
                                <button 
                                    className={styles["reset-button"]} 
                                    onClick={() => handleResetProductStock(product._id)}
                                >
                                    Reset Stock
                                </button>
                            </td>
                            <td>
                                <div className={styles["item-table-wrapper"]}>
                                    <table className={styles["item-table"]}>
                                    <thead>
                                        <tr>
                                            <td>Size</td>
                                            <td>Stock</td>
                                            <td>Threshold</td>
                                            <td>Target</td>
                                            <td>Amount</td>
                                            <td>Stock Level</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {product.items.map((item, itemIndex) => (
                                        <tr key={itemIndex}>
                                            <td>{item.size}</td>
                                            <td>
                                                {item?.stock.find(stock => stock.location === 'store')?.amount ?? 0}
                                            </td>
                                            <td>
                                                {item?.stock.find(stock => stock.location === 'store')?.threshold ?? 0}
                                            </td>
                                            <td>
                                                {item?.stock.find(stock => stock.location === 'store')?.target ?? 0}
                                            </td>
                                            <td>
                                                <select defaultValue="0" onChange={(e) => handleAddToCart(product, item, parseInt(e.target.value))}>
                                                {[...Array(item?.stock.find((stock) => stock.location === 'store')?.amount + 1).keys()].map((value) => (
                                                    <option key={value} value={value}>{value}</option>
                                                ))}
                                                </select>
                                            </td>
                                            <td>
                                                {<StockLevelBar stock={item?.stock} />}
                                            </td>
                                        </tr>
                                        
                                        ))}
                                    </tbody>
                                    </table>
                                    <button 
                                        className={styles["add-button"]} 
                                        onClick={() => handleClearCartItem(product._id)}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                        </table>
                    </div>
                </div>
                <div className={styles["shopping-cart"]}>
                    <h2>Shopping Cart</h2>
                    <table>
                        <thead>
                        <tr>
                            <th>Product</th>
                            <th>Size</th>
                            <th>Amount</th>
                        </tr>
                        </thead>
                        <tbody>
                        {cartItems.map((cartItem) => (
                            <tr key={cartItem.sku}>
                            <td>{cartItem.productName}</td>
                            <td>{cartItem.size}</td>
                            <td>{cartItem.amount}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <button>Buy</button>
                    <button onClick={() => handleClearAll()}>Clear All</button>
                </div>
            </div>
        </div>
        </>
    );
}

export async function getServerSideProps() {
    try {
        const client = await clientPromise;
        const db = client.db("interns_mongo_retail");

        const products = await db
            .collection("products")
            .find({})
            .toArray();

        return {
            props: { products: JSON.parse(JSON.stringify(products)) },
        };
    } catch (e) {
        console.error(e);
        return { props: {ok: false, reason: "Server error"}};
    }
}