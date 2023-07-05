import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShirt } from '@fortawesome/free-solid-svg-icons';

import styles from '../../styles/product.module.css';

export default function Product({ product }) {
    return (
        <div className={styles['product-detail-content']}>
            <div class="icon">
                <FontAwesomeIcon icon={faShirt} style={{ color: product.color.hex}}/>
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
                const stockLevel = item.stock.find(stock => stock.location === 'store')?.amount ?? 0;
                const stockThreshold = item.stock.find(stock => stock.location === 'store')?.threshold ?? 10;
                const progressBarColor = stockLevel >= stockThreshold ? 'green' : 'orange';
                const progressBarFill = (stockLevel / 20) * 100;
                return (
                <tr key={index}>
                <td>{item.size}</td>
                <td>{item.stock.find(stock => stock.location === 'store')?.amount ?? 0}</td>
                <td>{item.stock.find(stock => stock.location === 'ordered')?.amount ?? 0}</td>
                <td>{item.stock.find(stock => stock.location === 'warehouse')?.amount ?? 0}</td>
                <td>{item.delivery_time.amount}</td>
                <td>
                    <div className={styles['progress-bar-container']}>
                    <div className={styles['progress-bar-reference']}>
                        <div className={styles['progress-bar-level']} style={{ background: progressBarColor, width: `${progressBarFill}%` }}></div>
                    </div>
                    <span className={styles['progress-bar-label']}>20</span>
                    </div>
                </td>
                </tr>
                );
            })}
            </tbody>
        </table>
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
    }
}