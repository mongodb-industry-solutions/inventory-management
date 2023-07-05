import clientPromise from "../lib/mongodb";
import { useState, useEffect } from 'react';
import { FaSearch, FaTshirt } from 'react-icons/fa';

export default function Products({ products }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async () => {
    try {
      const response = await fetch(`/api/search?q=${searchQuery}`);
      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.results);
      } else {
        console.error(data.error);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setSearchResults(products);
  }, []);

  return (
    <div>
      <div className="search-bar">
        <input
          className="search-input"
          type="text"
          placeholder=" Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <button className="search-button" onClick={handleSearch}>
          <FaSearch />
        </button>
      </div>

      <ul className="product-list">
        {searchResults.length > 0 ? (
          searchResults.map((product) => (
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
          ))
        ) : (
          <li>No results found</li>
        )}
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
    return {
      props: { products: [] },
    };
  }
}
