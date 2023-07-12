import clientPromise from "../../lib/mongodb";
import { useState, useEffect } from 'react';
import { FaSearch, FaTshirt } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import Fuse from 'fuse.js';

export default function Products({ products, facets }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);

  const handleSearch = () => {
    if (searchQuery.length > 0) {
      const options = {
        keys: ['name', 'code', 'description'],
        includeScore: true,
        threshold: 0.4, // Adjust this value to control the tolerance for typos
      };

      const fuse = new Fuse(products, options);
      const searchResults = fuse.search(searchQuery).map(result => result.item);
      setFilteredProducts(searchResults);
    } else {
      setFilteredProducts(products);
    }
  };
  
  const handleSearchInputChange = (e) => {
    const searchValue = e.target.value;
    setSearchQuery(searchValue);
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery]);

  const filterProducts = (sizesFilter, colorsFilter) => {
    // Filter products based on sizes and colors
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
      <Sidebar facets={facets} filterProducts={filterProducts} />
      <div className="content">
        <div className="search-bar">
          <input
            className="search-input"
            type="text"
            placeholder=" Search..."
            value={searchQuery}
            onChange={handleSearchInputChange}
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