import { getClientPromise } from "../../lib/mongodb"; // Removed getEdgeClientPromise
import { useState, useEffect, useRef, useContext } from 'react';
import { useRouter } from 'next/router';
import { ServerContext } from '../_app';
import { FaSearch } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import ProductBox from '../../components/ProductBox';
import { ObjectId } from 'bson';
import { autocompleteProductsPipeline } from '../../data/aggregations/autocomplete';
import { searchProductsPipeline } from '../../data/aggregations/search';
import { UserContext } from '../../context/UserContext';
import { useToast } from '@leafygreen-ui/toast';

export default function Products({ products, facets }) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [displayProducts, setDisplayProducts] = useState(products);
  const [sortBy, setSortBy] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(null);
  const [previousItems, setPreviousItems] = useState(products.flatMap(product => product.items));

  const { pushToast } = useToast();
  const router = useRouter();
  const { location } = router.query;

  const utils = useContext(ServerContext);
  const { startWatchProductList, stopWatchProductList } = useContext(UserContext);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  let lastEtag = null;

  async function refreshProducts() {
    try {
      const headers = {};
      if (lastEtag) {
          headers['If-None-Match'] = lastEtag;
      }

      const response = await fetch('/api/edge/getProducts', { // Using the local Next.js API route
        method: 'GET',
        headers: headers
      });
      
      if (response.status === 304) {
        return;
      } else if (response.status === 200) {

        const etagHeader = response.headers.get('Etag');
        if (etagHeader) {
            lastEtag = etagHeader;
        }

        const refreshedProducts = await response.json();
        setDisplayProducts(refreshedProducts.products);
        checkForChangesAndAlerts(refreshedProducts.products);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  useEffect(() => {
    startWatchProductList(setDisplayProducts, addAlert, location, utils);
    return () => stopWatchProductList();
  }, []);

  useEffect(() => {
    if (searchQuery.length === 0) {
      const interval = setInterval(refreshProducts, 1000);
      return () => clearInterval(interval);
    }
  }, [searchQuery]);

  useEffect(() => {
    handleSearch();
  }, [searchQuery]);

  useEffect(() => {
    setDisplayProducts(products);
  }, [router.asPath]);

  const handleSearch = async () => {
    if (searchQuery.length > 0) {
      try {
        const response = await fetch('/api/edge/search?collection=products', { // Using Next.js API for search
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(searchQuery),
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
        const response = await fetch('/api/edge/autocomplete?collection=products', { // Using Next.js API for autocomplete
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(searchValue),
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
    const isInputFocused = document.activeElement === inputRef.current;

    if (isInputFocused && suggestions.length > 0) {
      const lastIndex = suggestions.length - 1;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prevIndex) =>
          prevIndex < lastIndex ? prevIndex + 1 : lastIndex
        );
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : 0
        );
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedSuggestionIndex !== null && selectedSuggestionIndex >= 0) {
          setSearchQuery(suggestions[selectedSuggestionIndex]);
          setSuggestions([]);
        }
      }
    }
  };

  const filterProducts = (itemsFilter, productsFilter) => {
    let updatedFilteredProducts = products.filter(product => {
      const items = product.items.map((item) => item.name);
      const products = product.name ? [product.name] : [];

      const itemMatch = itemsFilter.length === 0 || items.some(i => itemsFilter.includes(i));
      const productMatch = productsFilter.length === 0 || products.some(p => productsFilter.includes(p));

      return itemMatch && productMatch;
    });
    setDisplayProducts(updatedFilteredProducts);
  };

  const addAlert = (item) => {
    const queryParameters = new URLSearchParams(router.query).toString();
    const href = `/products/${item.product_id}?${queryParameters}`;

    pushToast({
      title: (
        <span>
          Item &nbsp; 
          <a href={href}>
            {item.sku}
          </a> 
          &nbsp; is low stock!
        </span>
      ), 
      variant: "warning"
    });
  };

  function checkForChangesAndAlerts(newProducts) {
    newProducts.forEach(newProduct => {
        newProduct.items.forEach(newItem => {
            const previousItem = previousItems.find(prevItem => prevItem.sku === newItem.sku);

            const newStock = location ? 
                newItem.stock.find(stock => stock.location.id === location)
                : newItem.stock.find(stock => stock.location.type !== "warehouse");

            const previousStock = location ? 
                previousItem.stock.find(stock => stock.location.id === location)
                : previousItem.stock.find(stock => stock.location.type !== "warehouse");

            if (newStock.amount + newStock.ordered < newStock.threshold && newStock.amount < previousStock.amount) {
                newItem.product_id = newProduct._id;
                addAlert(newItem);
            }
        });
    });

    setPreviousItems(newProducts.flatMap(product => product.items));
  }

  const handleSortByPopularity = () => {
    setSortBy('popularity');
    setDisplayProducts(prevProducts => [...prevProducts].sort((a, b) => b.popularity_index - a.popularity_index));
  };

  const handleSortByLowStock = () => {
    setSortBy('lowStock');
    setDisplayProducts((prevProducts) => {
      const displayedProducts = [...prevProducts].sort((a, b) => {
        
        const countLowStockSizes = location
          ? (product) =>
              product.items.reduce((count, item) => (item.stock.find(stock => stock.location.id === location)?.amount < 10 ? count + 1 : count), 0)
          : (product) =>
              product.items.reduce((count, item) => (item.stock.find(stock => stock.location.type !== "warehouse")?.amount < 10 ? count + 1 : count), 0);

        const lowStockSizesA = countLowStockSizes(a);
        const lowStockSizesB = countLowStockSizes(b);

        if (lowStockSizesA > 0 && lowStockSizesB === 0) {
          return -1;
        } else if (lowStockSizesA === 0 && lowStockSizesB > 0) {
          return 1;
        } else if (lowStockSizesA !== lowStockSizesB) {
          return lowStockSizesB - lowStockSizesA;
        } else {
          const totalStockAmount = location
            ? (product) =>
                product.items.reduce((total, item) => total + item.stock.find(stock => stock.location.id === location)?.amount, 0)
            : (product) =>
                product.items.reduce((total, item) => total + item.stock.find(stock => stock.location.type !== "warehouse")?.amount, 0);

          const totalStockA = totalStockAmount(a);
          const totalStockB = totalStockAmount(b);
          return totalStockA - totalStockB;
        }
      });
  
      return displayedProducts;
    });
  };

  const handleInputKeyUp = (e) => {
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
            ref={inputRef}
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
    </>
  );
}

export async function getServerSideProps({ query }) {
  try {
    if (!process.env.MONGODB_DATABASE_NAME) {
      throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
    }

    const dbName = process.env.MONGODB_DATABASE_NAME;

    const locationId = query.location;

    const client = await getClientPromise();
    const db = client.db(dbName);
    
    const collectionName = locationId ? "products" : "products_area_view";
    const productsFilter = locationId ? { "total_stock_sum.location.id": new ObjectId(locationId) } : {};

    const products = await db.collection(collectionName).find(productsFilter).toArray();

    const agg = [
      {
        $searchMeta: {
          index: "facets",
          facet: {
            facets: {
              productsFacet: { type: "string", path: "name", numBuckets: 50 },
              itemsFacet: { type: "string", path: "items.name", numBuckets: 50 },
            },
          },
        },
      },
    ];

    const facets = await db.collection("products").aggregate(agg).toArray();

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
