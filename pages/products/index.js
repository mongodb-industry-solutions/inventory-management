import clientPromise from "../../lib/mongodb";
import { useState, useEffect } from 'react';
import  *  as  Realm  from  "realm-web";

import { FaSearch } from 'react-icons/fa';

import Sidebar from '../../components/Sidebar';
import ProductBox from '../../components/ProductBox';
import AlertBanner from '../../components/AlertBanner';
import Fuse from 'fuse.js';

const  app = new  Realm.App({ id:  "interns-mongo-retail-app-nghfn"});

export default function Products({ products, facets }) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);
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