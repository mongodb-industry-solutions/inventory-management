import clientPromise from "../lib/mongodb";
import { FaSearch, FaTshirt } from 'react-icons/fa';

export default function Products({ products }) {
  return (
    <div>
      <div className="search-bar">
        <input className="search-input" type="text" placeholder=" Search..." />
        <button className="search-button">
          <FaSearch />
        </button>
      </div>

      <ul className="product-list">
        {products.map((product) => (
          <li key={product._id} className="product-item">
            <a href={`/products/${product._id}`} className="product-link">
              <div className="shirt_icon">
                <FaTshirt color={product.color.hex} />
              </div>
              <h2>{product.name}</h2>
              <h3>{product.code}</h3>
              <p>{product.description}</p>
            </a>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .product-link {
          text-decoration: none;
          color: black;
        }
      `}</style>
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
