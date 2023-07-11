import clientPromise from "../lib/mongodb";
import { useState, useEffect } from 'react';
import { FaSearch, FaTshirt } from 'react-icons/fa';
import Sidebar from '../components/Sidebar'

export default function Products({ products, facets }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState(products);

  const handleSearch = async () => {
    try {
      const response = await fetch(`/api/search?q=${searchQuery}`);
      const data = await response.json();
  
      if (response.ok) {
        setFilteredProducts(data.results); // Update the filteredProducts state with the search results
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

  const filterProducts = (sizesFilter, colorsFilter) => {
    
    let updatedFilteredProducts = products.filter(product => {
        const sizes = product.items.map((item) => item.size);
        const colors = product.color ? [product.color.name] : [];

        const sizeMatch = sizesFilter.length === 0 || sizes.some(size => sizesFilter.includes(size));
        const colorMatch = colorsFilter.length === 0 || colors.some(color => colorsFilter.includes(color));

        return sizeMatch && colorMatch;
        });
    setFilteredProducts(updatedFilteredProducts);
    console.log('sizes:' + sizesFilter + ' colors:' + colorsFilter + ' products: ' + updatedFilteredProducts.length);
   
  };

  return (
    <>
    <Sidebar facets={facets} filterProducts={filterProducts}/>
    <div className="content">
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
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
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
    </>
  );
}

export async function getServerSideProps() {
  try {
    const client = await clientPromise;
    const db = client.db("interns_mongo_retail");

    const agg = [{$searchMeta: {
      index: "internsmongoretail-productfacets",
      facet: {
        facets: {
          colorsFacet: {type: "string", path: "color.name"},
          sizesFacet: {type: "string", path: "items.size"}
        }
      }
    }}];

    const facets = await db
      .collection("products")
      .aggregate(agg)
      .toArray();

    const products = await db
      .collection("products")
      .find({})
      .sort({ popularity_index: -1 })
      .limit(20)
      .toArray();

    return {
      props: { products: JSON.parse(JSON.stringify(products)), facets: JSON.parse(JSON.stringify(facets))},
    };
  } catch (e) {
    console.error(e);
    return {
      props: { products: [] },
    };
  }
}