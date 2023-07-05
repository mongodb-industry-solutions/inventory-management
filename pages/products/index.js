import clientPromise from "../../lib/mongodb";

import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Sidebar from '../../components/Sidebar';
import { FaSearch } from 'react-icons/fa';

export default function Products({ products }) {
    return (
        <div>
            <div className="search-bar">
        <input className="search-input" type="text" placeholder=" Search..." />
        <button className="search-button">
          <FaSearch />
        </button>
      </div>

            <h1>Products</h1>
            <ul>
                {products.map((product) => (
                   <li key={product._id}>
                   <h2><a href={`http://localhost:3000/products/${product._id}`}>{product.name}</a></h2>
                   <h3>{product.code}</h3>
                   <p>{product.description}</p>
                 </li>
                ))}
            </ul>
        </div>

    );
}

export async function getServerSideProps() {
    try {
        const client = await clientPromise;
        const db = client.db("interns_mongo_retail");

        const products = await db
            .collection("products")
            .find({})
            .sort({ popularity_index: -1 })
            .limit(20)
            .toArray();

        return {
            props: { products: JSON.parse(JSON.stringify(products)) },
        };
    } catch (e) {
        console.error(e);
    }
}