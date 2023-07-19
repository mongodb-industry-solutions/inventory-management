import clientPromise from "../lib/mongodb";
import { useState, useEffect } from 'react';
import { FaSearch, FaTshirt } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import Fuse from 'fuse.js';

export default function Products({ products, facets }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [sortedProducts, setSortedProducts] = useState(products);
  const [sortBy, setSortBy] = useState('');

  const handleSearch = async () => {
    if (searchQuery.length > 0) {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        const searchResults = data.results;
        setFilteredProducts(searchResults);
        setSortedProducts(searchResults);
      } catch (error) {
        console.error(error);
      }
    } else {
      setFilteredProducts(products);
      setSortedProducts(products);
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
    setSortedProducts(updatedFilteredProducts); // Update sorted products when filters change
    console.log('sizes:' + sizesFilter + ' colors:' + colorsFilter + ' products: ' + updatedFilteredProducts.length);
  };

  const handleSortByPopularity = () => {
    console.log('Sorting by popularity');
    setSortBy('popularity');
    setSortedProducts(prevProducts => [...prevProducts].sort((a, b) => b.popularity_index - a.popularity_index));
  };

  const handleSortByLowStock = () => {
    console.log('Sorting by low stock');
    setSortBy('lowStock');
    setSortedProducts(prevProducts =>
      [...prevProducts].sort((a, b) => {
        const totalStockSumA = a.total_stock_sum.find(stock => stock.location === 'store');
        const totalStockSumB = b.total_stock_sum.find(stock => stock.location === 'store');

        if (!totalStockSumA && !totalStockSumB) {
          return 0;
        }
        if (!totalStockSumA) {
          return 1;
        }
        if (!totalStockSumB) {
          return -1;
        }

        const lowStockSizesCountA = a.items.filter(item => item.stock.some(stock => stock.location === 'store' && stock.amount < stock.threshold)).length;
        const lowStockSizesCountB = b.items.filter(item => item.stock.some(stock => stock.location === 'store' && stock.amount < stock.threshold)).length;

        const scoreA = lowStockSizesCountA * (totalStockSumA.target - totalStockSumA.amount);
        const scoreB = lowStockSizesCountB * (totalStockSumB.target - totalStockSumB.amount);

        if (scoreA === scoreB) {
          return totalStockSumA.location.localeCompare(totalStockSumB.location);
        }

        return scoreB - scoreA;
      })
    );
  };

  console.log('Filtered products:', filteredProducts);

  return (
    <>
      <Sidebar facets={facets} filterProducts={filterProducts} page="products"/>
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
        <div className="order-by-container">
          <p className="order-by-text">Order by:</p>
          <div className="buttons">
            <button className="sidebar-button" onClick={handleSortByPopularity}>Most Popular</button>
            <button className="sidebar-button" onClick={handleSortByLowStock}>Low on Stock Items</button>
          </div>
        </div>

        <ul className="product-list">
          {sortedProducts.length > 0 ? (
            sortedProducts.map((product) => (
              <li key={product._id} className="product-item">
                <a href={`/products/${product._id}`} className="product-link">
                  <div className="shirt_icon">
                    <FaTshirt color={product.color.hex} />
                  </div>
                  <div className="product-info">
                    <div className="name-price-wrapper">
                      <div className="name-wrapper">
                        <h2>{product.name}</h2>
                        <h3>{product.code}</h3>
                      </div>
                      <div className="price-wrapper">
                        <p className="price">{product.price.amount} {product.price.currency}</p>
                      </div>
                    </div>
                    <p>{product.description}</p>
                  </div>
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

    const agg = [
      {
        $searchMeta: {
          index: "internsmongoretail-productfacets",
          facet: {
            facets: {
              colorsFacet: { type: "string", path: "color.name" },
              sizesFacet: { type: "string", path: "items.size" },
            },
          },
        },
      },
    ];

    const facets = await db
      .collection("products")
      .aggregate(agg)
      .toArray();

    let products = await db
      .collection("products")
      .find({})
      .toArray();

    return {
      props: { products: JSON.parse(JSON.stringify(products)), facets: JSON.parse(JSON.stringify(facets)) },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { products: [] },
    };
  }
}
