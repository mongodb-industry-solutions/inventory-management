import clientPromise from "../../lib/mongodb";
import { useState, useEffect, useRef } from 'react';
import  *  as  Realm  from  "realm-web";

import { FaSearch } from 'react-icons/fa';

import Sidebar from '../../components/Sidebar';
import ProductBox from '../../components/ProductBox';
import AlertBanner from '../../components/AlertBanner';

const  app = new  Realm.App({ id:  "interns-mongo-retail-app-nghfn"});

export default function Products({ products, facets }) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [displayProducts, setDisplayProducts] = useState(products);
  const [sortBy, setSortBy] = useState('');
   const [alerts, setAlerts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(null);
 
  
  // Create a ref for the input element
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    const  login = async () => {
        
      await app.logIn(Realm.Credentials.anonymous());
      const mongodb = app.currentUser.mongoClient("mongodb-atlas");
      const collection = mongodb.db("interns_mongo_retail").collection("products");
      let updatedProduct = null;
      
      for await (const  change  of  collection.watch()) {
        updatedProduct = change.fullDocument;
        updatedProduct._id = updatedProduct._id.toString();

        setDisplayProducts((prevProducts) =>
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
        const response = await fetch(`/api/suggestions?q=${encodeURIComponent(searchValue)}`);
        const data = await response.json();
        setSuggestions(data.suggestions);
      } catch (error) {
        console.error(error);
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

  
  
  

  const filterProducts = (sizesFilter, colorsFilter) => {
    // Filter products based on sizes and colors
    let updatedFilteredProducts = products.filter(product => {
      const sizes = product.items.map((item) => item.size);
      const colors = product.color ? [product.color.name] : [];

      const sizeMatch = sizesFilter.length === 0 || sizes.some(size => sizesFilter.includes(size));
      const colorMatch = colorsFilter.length === 0 || colors.some(color => colorsFilter.includes(color));

      return sizeMatch && colorMatch;
    });
    setDisplayProducts(updatedFilteredProducts); // Update sorted products when filters change
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
    setDisplayProducts(prevProducts => [...prevProducts].sort((a, b) => b.popularity_index - a.popularity_index));
  };

  const handleSortByLowStock = () => {
    console.log('Sorting by low stock');
    setSortBy('lowStock');
    setDisplayProducts((prevProducts) => {
      const displayedProducts = [...prevProducts].sort((a, b) => {
        const countLowStockSizes = (product) =>
          product.items.reduce((count, item) => (item.stock[0].amount < 10 ? count + 1 : count), 0);
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
          const totalStockAmount = (product) =>
            product.items.reduce((total, item) => total + item.stock[0].amount, 0);
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