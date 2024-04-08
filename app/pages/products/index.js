import { getClientPromise, getEdgeClientPromise }  from "../../lib/mongodb";
import { useState, useEffect, useRef, useContext } from 'react';
import { useRouter } from 'next/router';
import { ServerContext } from '../_app';
import { FaSearch } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import ProductBox from '../../components/ProductBox';
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
  const { location, edge } = router.query;

  const utils = useContext(ServerContext);
  const {startWatchProductList, stopWatchProductList} = useContext(UserContext);
  
  // Create a ref for the input element
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  let lastEtag = null;

  async function refreshProducts() {
    try {
      const headers = {};
      if (lastEtag) {
          headers['If-None-Match'] = lastEtag;
      }

      const response = await fetch('/api/edge/getProducts', {
        method: 'GET',
        headers: headers
      });
      
      if (response.status === 304) { // 304 Not Modified
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
    if (edge !== 'true') {
      startWatchProductList(setDisplayProducts,addAlert, location, utils);
      return () => stopWatchProductList();
    }
  }, [edge]);

  useEffect(() => {
    if (edge === 'true' && searchQuery.length === 0) {
      const interval = setInterval(refreshProducts, 1000);
      return () => clearInterval(interval);
    }
  }, [edge, searchQuery]);

  useEffect(() => {
    handleSearch();
  }, [searchQuery]);

  useEffect(() => {
    setDisplayProducts(products);
  }, [router.asPath]);

  const handleSearch = async () => {
    if (searchQuery.length > 0) {
      try {
        let response;
        if (edge === 'true') {
          response = await fetch('/api/edge/search?collection=products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(searchQuery),
          });
        } else {
          response = await fetch(utils.apiInfo.dataUri + '/action/aggregate', {
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
        }
        
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
        let response;
        if (edge === 'true') {
          response = await fetch('/api/edge/autocomplete?collection=products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify(searchValue),
          });
        } else {
          response = await fetch(utils.apiInfo.dataUri + '/action/aggregate', {
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
        }
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

  // Function to add a new alert to the list
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

            // Compare stock amounts
            const newStock = location ? 
                newItem.stock.find(stock => stock.location.id === location)
                : newItem.stock.find(stock => stock.location.type !== "warehouse");

            const previousStock = location ? 
                previousItem.stock.find(stock => stock.location.id === location)
                : previousItem.stock.find(stock => stock.location.type !== "warehouse");

            if (newStock.amount + newStock.ordered < newStock.threshold && newStock.amount < previousStock.amount) {
                newItem.product_id = newProduct._id;
                console.log(newItem);
                addAlert(newItem);
            }
        });
    });

    // Update previous state with new data
    setPreviousItems(newProducts.flatMap(product => product.items));
  }

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
    const edge = (query.edge === 'true');

    const client = edge ? await getEdgeClientPromise() : await getClientPromise();
    const db = client.db(dbName);
    
    const collectionName = locationId ? "products" : "products_area_view";

    const products = await db.collection(collectionName).find({}).toArray();

    let facets = [];

    if (edge){
  
      const itemsAggregated = products.flatMap(product => product.items.map(item => item.name));
      const itemsFacetBuckets = Array.from(new Set(itemsAggregated)).map(item => ({ _id: item, count: itemsAggregated.filter(i => i === item).length }));

      const productsFacetBuckets = products.map(product => {
        return {
          _id: product.name,
          count: 1,
        };
      });

      const facetGroup = {
        facet: {
          itemsFacet: { buckets: itemsFacetBuckets },
          productsFacet: { buckets: productsFacetBuckets },
        }
      };

      facets.push(facetGroup);
    } else {
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
  
      facets = await db
        .collection("products")
        .aggregate(agg)
        .toArray();

    }

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