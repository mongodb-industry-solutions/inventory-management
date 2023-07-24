import clientPromise from "../lib/mongodb";
import { useState, useEffect } from 'react';
import  *  as  Realm  from  "realm-web";

import { FaSearch } from 'react-icons/fa';

import Sidebar from '../components/Sidebar';
import ProductBox from '../components/ProductBox';
import AlertBanner from '../components/AlertBanner';

const  app = new  Realm.App({ id:  "interns-mongo-retail-app-nghfn"});

export default function Products({ products, facets }) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [sortedProducts, setSortedProducts] = useState(products);
  const [sortBy, setSortBy] = useState('');
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const  login = async () => {
        
      await app.logIn(Realm.Credentials.anonymous());
      const mongodb = app.currentUser.mongoClient("mongodb-atlas");
      const collection = mongodb.db("interns_mongo_retail").collection("products");
      let updatedProduct = null;
      
      for await (const  change  of  collection.watch()) {
        updatedProduct = change.fullDocument;
        updatedProduct._id = updatedProduct._id.toString();

        setFilteredProducts((prevProducts) =>
          prevProducts.map((product) =>
            product._id === updatedProduct._id ? updatedProduct : product
          )
        );

        const pattern = /^items\.(\d+)\.stock/;
        for(const key of Object.keys(change.updateDescription.updatedFields)){
          if (pattern.test(key)) {
            let item = updatedProduct.items[parseInt(key.match(pattern)[1], 10)];
            let itemStoreStock = item.stock.find(stock => stock.location === 'store');
            
            if(itemStoreStock.amount < itemStoreStock.threshold) {
              item.product_id = updatedProduct._id;
              addAlert(item);
            }
          }
        }

      }
    }
    login();
    handleSearch();
  }, [searchQuery]);

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
    }
  };
  

  const handleSearchInputChange = (e) => {
    const searchValue = e.target.value;
    setSearchQuery(searchValue);
  };

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
    //console.log('sizes:' + sizesFilter + ' colors:' + colorsFilter + ' products: ' + updatedFilteredProducts.length);
  };

  const handleAlertClose = (sku) => {
    setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.sku !== sku));
  };

  // Function to add a new alert to the list
  const addAlert = (item) => {

    setAlerts((prevAlerts) => {
      if (prevAlerts.some((alert) => alert.sku === item.sku)) {
        return prevAlerts;
      } else {
        return [item, ...prevAlerts].slice(0, 3);
      }
    });
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
  
        if (totalStockSumA.amount === totalStockSumB.amount) {
          return totalStockSumA.location.localeCompare(totalStockSumB.location);
        }
  
        return totalStockSumA.amount - totalStockSumB.amount;
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
            <button className={`sidebar-button ${sortBy === 'popularity' ? 'selected' : ''}`} onClick={handleSortByPopularity}>Most Popular</button>
            <button className={`sidebar-button ${sortBy === 'lowStock' ? 'selected' : ''}`} onClick={handleSortByLowStock}>Low on Stock Items</button>
          </div>
        </div>

        <ul className="product-list">
          {sortedProducts.length > 0 ? (
            sortedProducts.map((product) => (
              <ProductBox key={product._id} product={product}/>
            ))
          ) : (
            <li>No results found</li>
          )}
        </ul>
      </div>
      <div className="alert-container">
        {alerts.map((item) => (
          <AlertBanner key={item.sku} item={item} onClose={() => handleAlertClose(item.sku)} />
        ))}
      </div>
    </>
  );
}

export async function getServerSideProps({ query }) {
  try {
    const client = await clientPromise;
    const db = client.db("interns_mongo_retail");
    const searchQuery = query.q || '';

    let products;
    if (searchQuery) {
      const searchAgg = [
        {
          $search: {
            index: 'default',
            text: {
              query: searchQuery,
              path: {
                wildcard: '*',
              },
              fuzzy: {
                maxEdits: 2, // Adjust the number of maximum edits for typo-tolerance
              },
            },
          },
        },
      ];

      products = await db.collection("products").aggregate(searchAgg).toArray();
    } else {
      products = await db.collection("products").find({}).toArray();
    }

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
