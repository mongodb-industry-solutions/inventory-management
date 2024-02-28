import clientPromise from "../../lib/mongodb";
import { useState, useEffect, useRef, useContext } from 'react';
import  *  as  Realm  from  "realm-web";
import { useRouter } from 'next/router';
import { ServerContext } from '../_app';
import { FaSearch } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import ProductBox from '../../components/ProductBox';
import AlertBanner from '../../components/AlertBanner';
import { autocompleteProductsPipeline } from '../../data/aggregations/autocomplete';
import { searchProductsPipeline } from '../../data/aggregations/search';

export default function Products({ products, facets }) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [displayProducts, setDisplayProducts] = useState(products);
  const [sortBy, setSortBy] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(null);

  const router = useRouter();
  const { location } = router.query;

  const utils = useContext(ServerContext);
  
  const  app = new  Realm.App({ id: utils.appServiceInfo.appId });

  // Create a ref for the input element
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const  login = async () => {
        
      await app.logIn(Realm.Credentials.anonymous());
      const mongodb = app.currentUser.mongoClient("mongodb-atlas");
      const collection = mongodb.db(utils.dbInfo.dbName).collection("products");
      let updatedProduct = null;
      
      const filter = {filter: {operationType: "update"}};

      for await (const  change  of  collection.watch(filter)) {
        updatedProduct = JSON.parse(JSON.stringify(change.fullDocument));

        if (!location) {
            let productView = await mongodb
                .db(utils.dbInfo.dbName)
                .collection("products_area_view")
                .findOne({ _id: change.fullDocument._id});
            updatedProduct = JSON.parse(JSON.stringify(productView));
        }

        setDisplayProducts((prevProducts) =>
          prevProducts.map((product) =>
            product._id === updatedProduct._id ? updatedProduct : product
          )
        );

        const pattern = /^items\.(\d+)\.stock/;
        for(const key of Object.keys(change.updateDescription.updatedFields)){

          if (pattern.test(key)) {
            let sku = change.fullDocument.items[parseInt(key.match(pattern)[1], 10)].sku;
            let item = updatedProduct.items.find(item => item.sku === sku);

            let itemStock = location ? 
              item.stock.find(stock => stock.location.id === location)
              : item.stock.find(stock => stock.location.type !== "warehouse");
            
            if(itemStock?.amount < itemStock?.threshold) {
              item.product_id = updatedProduct._id;
              addAlert(item);
            }
          }
        }

      }
    }
    login();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchQuery]);

  useEffect(() => {
    setDisplayProducts(products);
  }, [router.asPath]);

  const handleSearch = async () => {
    if (searchQuery.length > 0) {
      try {
        const response = await fetch(utils.apiInfo.dataUri + '/action/aggregate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + utils.apiInfo.accessToken,
          },
          body: JSON.stringify({
            dataSource: 'mongodb-atlas',
            database: utils.dbInfo.dbName,
            collection: 'products',
            pipeline: searchProductsPipeline(searchQuery, location)
          }),
        });

        const data = await response.json();
        const searchResults = data.documents;

        setDisplayProducts(searchResults);
      } catch (error) {
        console.error(error);
      }
    } else {
      setDisplayProducts(products);
    }
  };
  

  const handleSearchInputChange = async (e) => {
    const searchValue = e.target.value;
    setSearchQuery(searchValue);
  
    if (searchValue.length > 0) {
      try {
        const response = await fetch(utils.apiInfo.dataUri + '/action/aggregate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + utils.apiInfo.accessToken,
          },
          body: JSON.stringify({
            dataSource: 'mongodb-atlas',
            database: utils.dbInfo.dbName,
            collection: 'products',
            pipeline: autocompleteProductsPipeline(searchValue)
          }),
        });
        const data = await response.json();
        setSuggestions(data.documents[0].suggestions);
      } catch (error) {
        setSuggestions([]); // Set an empty array if there's an error to prevent undefined value
      }
    } else {
      setSuggestions([]);
    }

    setSelectedSuggestionIndex(-1);
  };
  
  const handleKeyDown = (e) => {
    // Check if the input element is focused
    const isInputFocused = document.activeElement === inputRef.current;

    if (isInputFocused && suggestions.length > 0) {
      const lastIndex = suggestions.length - 1;

      // Check if the user pressed the down arrow key
      if (e.key === "ArrowDown") {
        e.preventDefault(); // Prevents scrolling the page

        // If no suggestion is selected, select the first one (index 0)
        if (selectedSuggestionIndex === null) {
          setSelectedSuggestionIndex(0);
        } else {
          // If not at the last suggestion, move to the next one
          setSelectedSuggestionIndex((prevIndex) =>
            prevIndex < lastIndex ? prevIndex + 1 : lastIndex
          );
        }
      }

      // Check if the user pressed the up arrow key
      if (e.key === "ArrowUp") {
        e.preventDefault(); // Prevents scrolling the page

        // If no suggestion is selected, do nothing
        if (selectedSuggestionIndex !== null) {
          // If not at the first suggestion, move to the previous one
          setSelectedSuggestionIndex((prevIndex) =>
            prevIndex > 0 ? prevIndex - 1 : 0
          );
        }
      }

      // Check if the user pressed the Enter key
      if (e.key === "Enter") {
        e.preventDefault(); // Prevents form submission or other default behavior
        if (selectedSuggestionIndex !== null && selectedSuggestionIndex >= 0) {
          // If a suggestion is selected, use its value as the search query
          setSearchQuery(suggestions[selectedSuggestionIndex]);
          setSuggestions([]); // Hide the suggestions
        }
      }
    }
  };

  
  
  

  const filterProducts = (itemsFilter, productsFilter) => {
    // Filter products based on items and products
    let updatedFilteredProducts = products.filter(product => {
      const items = product.items.map((item) => item.name);
      const products = product.name ? [product.name] : [];

      const itemMatch = itemsFilter.length === 0 || items.some(i => itemsFilter.includes(i));
      const productMatch = productsFilter.length === 0 || products.some(p => productsFilter.includes(p));

      return itemMatch && productMatch;
    });
    setDisplayProducts(updatedFilteredProducts); // Update sorted products when filters change
    //console.log('items:' + itemsFilter + ' products:' + productsFilter + ' products: ' + updatedFilteredProducts.length);
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
    setDisplayProducts(prevProducts => [...prevProducts].sort((a, b) => b.popularity_index - a.popularity_index));
  };

  const handleSortByLowStock = () => {
    console.log('Sorting by low stock');
    setSortBy('lowStock');
    setDisplayProducts((prevProducts) => {
      const displayedProducts = [...prevProducts].sort((a, b) => {
        
        var countLowStockSizes = null;
        if(location){
          countLowStockSizes = (product) =>
            product.items.reduce((count, item) => (item.stock.find(stock => stock.location.id === location)?.amount < 10 ? count + 1 : count), 0);
        } else {
          countLowStockSizes = (product) =>
            product.items.reduce((count, item) => (item.stock.find(stock => stock.location.type !== "warehouse")?.amount < 10 ? count + 1 : count), 0);
        }
    
        const lowStockSizesA = countLowStockSizes(a);
        const lowStockSizesB = countLowStockSizes(b);
  
        if (lowStockSizesA > 0 && lowStockSizesB === 0) {
          return -1; // Prioritize 'a' if it has at least one low stock size and 'b' doesn't
        } else if (lowStockSizesA === 0 && lowStockSizesB > 0) {
          return 1; // Prioritize 'b' if it has at least one low stock size and 'a' doesn't
        } else if (lowStockSizesA !== lowStockSizesB) {
          return lowStockSizesB - lowStockSizesA;
        } else {
          // If both have the same count of low stock sizes, sort by total stock amount
          var totalStockAmount = null;
          if(location){
            totalStockAmount = (product) =>
              product.items.reduce((total, item) => total + item.stock.find(stock => stock.location.id === location)?.amount, 0);
          } else {
            totalStockAmount = (product) =>
              product.items.reduce((total, item) => total + item.stock.find(stock => stock.location.type !== "warehouse")?.amount, 0);
          }

          const totalStockA = totalStockAmount(a);
          const totalStockB = totalStockAmount(b);
          return totalStockA - totalStockB; // Higher total stock amount will appear last
        }
      });
  
      return displayedProducts;
    });
  };

  const handleInputKeyUp = (e) => {
    // Listen for the keyup event and clear the suggestions if the input value is empty
    if (e.target.value === '') {
      setSuggestions([]);
    }
  };

  return (
    <>
      <div className='content'>
      <Sidebar facets={facets} filterProducts={filterProducts} page="products" />
        <div className="search-bar">
          <input
            ref={inputRef} // Attach the ref to the input element
            className="search-input"
            type="text"
            placeholder=" Search..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleInputKeyUp}
          />
          <button className="search-button" onClick={handleSearch}>
            <FaSearch />
          </button>
        </div>
        
           {/* Display autocomplete suggestions */}
           { suggestions.length > 0 && (
  <ul className="autocomplete-list" ref={suggestionsRef} tabIndex={0} onKeyDown={handleKeyDown}>
    { suggestions.map((suggestion, index) => (
      <li key={suggestion} className="autocomplete-item">
        <button
          className={`autocomplete-button ${
            index === selectedSuggestionIndex ? "selected" : ""
          }`}
          onClick={() => {
            setSearchQuery(suggestion);
            setSuggestions([]);
          }}
        >
          {suggestion}
        </button>
      </li>
    ))}
  </ul>
)}


  <div className="order-by-container">
          <p className="order-by-text">Order by:</p>
          <div className="buttons">
            <button className={`sidebar-button ${sortBy === 'popularity' ? 'selected' : ''}`} onClick={handleSortByPopularity}>Most Popular</button>
            <button className={`sidebar-button ${sortBy === 'lowStock' ? 'selected' : ''}`} onClick={handleSortByLowStock}>Low Stock</button>
          </div>
        </div>
        

        <ul className="product-list">
        
          {displayProducts.length > 0 ? (
            displayProducts.map((product) => (
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
    if (!process.env.MONGODB_DATABASE_NAME) {
      throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
    }

    const dbName = process.env.MONGODB_DATABASE_NAME;
    
    const client = await clientPromise;
    const db = client.db(dbName);
    const searchQuery = query.q || '';
    const locationId = query.location;

    const collectionName = locationId ? "products" : "products_area_view";

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

      products = await db.collection(collectionName).aggregate(searchAgg).toArray();
    } else {
      products = await db.collection(collectionName).find({}).toArray();
    }

    const agg = [
      {
        $searchMeta: {
          index: "facets",
          facet: {
            facets: {
              productsFacet: { type: "string", path: "name", numBuckets: 20 },
              itemsFacet: { type: "string", path: "items.name" },
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