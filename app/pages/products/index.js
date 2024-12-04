import { getClientPromise, getEdgeClientPromise } from "../../lib/mongodb";
import { useState, useEffect, useRef, useContext } from 'react';
import { useRouter } from 'next/router';
import { FaSearch } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import ProductBox from '../../components/ProductBox';
import { ObjectId } from 'bson';
import { UserContext } from '../../context/UserContext';
import { useToast } from '@leafygreen-ui/toast';

export default function Products({ products, facets }) {

  // State variables
  const [searchQuery, setSearchQuery] = useState('');
  const [displayProducts, setDisplayProducts] = useState(products);
  const [sortBy, setSortBy] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(null);
  const [previousItems, setPreviousItems] = useState(products.flatMap(product => product.items));

  const { pushToast } = useToast();
  const router = useRouter();
  const { location, edge } = router.query;
  const { startWatchProductList } = useContext(UserContext); // Use UserContext for starting and stopping streams

  // Refs
  const inputRef = useRef(null);

  useEffect(() => {
    console.log("Products component mounted. Starting watchProductList SSE...");

    const stopWatch = startWatchProductList(setDisplayProducts, addAlert); // Start SSE stream

    return () => {
      console.log("Products component unmounted. Stopping watchProductList SSE...");
      stopWatch(); // Stop SSE stream on unmount
    };
  }, [startWatchProductList]); // Add dependency to re-run if startWatchProductList changes

  useEffect(() => {
    handleSearch(); // Trigger search whenever the search query changes
  }, [searchQuery]);

  useEffect(() => {
    setDisplayProducts(products); // Update displayed products when router path changes
  }, [router.asPath]);

  // Function to handle changes in the search bar
  const handleSearch = async () => {
    if (searchQuery.length > 0) {
      try {
        const response = await fetch('/api/search?collection=products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(searchQuery),
        });

        const data = await response.json();
        setDisplayProducts(data.documents);
      } catch (error) {
        console.error(error);
      }
    } else {
      setDisplayProducts(products);
    }
  };

  // Function to handle input changes in the search bar and provide suggestions
  const handleSearchInputChange = async (e) => {
    const searchValue = e.target.value;
    setSearchQuery(searchValue);

    if (searchValue.length > 0) {
      try {
        const response = await fetch('/api/autocomplete?collection=products', {
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
        console.error('Autocomplete error:', error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
    setSelectedSuggestionIndex(-1);
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

  // Function to filter products based on selected items and products
  const filterProducts = (itemsFilter, productsFilter) => {
    const updatedFilteredProducts = products.filter(product => {
      const items = product.items.map((item) => item.name);
      const products = product.name ? [product.name] : [];

      const itemMatch = itemsFilter.length === 0 || items.some(i => itemsFilter.includes(i));
      const productMatch = productsFilter.length === 0 || products.some(p => productsFilter.includes(p));

      return itemMatch && productMatch;
    });
    setDisplayProducts(updatedFilteredProducts);
  };

  // Function to handle sorting by popularity
  const handleSortByPopularity = () => {
    console.log('Sorting by popularity');
    setSortBy('popularity');
    setDisplayProducts(prevProducts => [...prevProducts].sort((a, b) => b.popularity_index - a.popularity_index));
  };

  // Function to handle sorting by low stock
  const handleSortByLowStock = () => {
    console.log('Sorting by low stock');
    setSortBy('lowStock');
    setDisplayProducts(prevProducts => {
      return [...prevProducts].sort((a, b) => {
        const countLowStockSizes = (product) => {
          if (location) {
            return product.items.reduce((count, item) =>
              item.stock.find(stock => stock.location.id === location)?.amount < 10 ? count + 1 : count, 0);
          } else {
            return product.items.reduce((count, item) =>
              item.stock.find(stock => stock.location.type !== "warehouse")?.amount < 10 ? count + 1 : count, 0);
          }
        };

        const lowStockSizesA = countLowStockSizes(a);
        const lowStockSizesB = countLowStockSizes(b);

        if (lowStockSizesA > 0 && lowStockSizesB === 0) {
          return -1;
        } else if (lowStockSizesA === 0 && lowStockSizesB > 0) {
          return 1;
        } else if (lowStockSizesA !== lowStockSizesB) {
          return lowStockSizesB - lowStockSizesA;
        } else {
          const totalStockAmount = (product) => {
            if (location) {
              return product.items.reduce((total, item) =>
                total + item.stock.find(stock => stock.location.id === location)?.amount, 0);
            } else {
              return product.items.reduce((total, item) =>
                total + item.stock.find(stock => stock.location.type !== "warehouse")?.amount, 0);
            }
          };

          return totalStockAmount(a) - totalStockAmount(b);
        }
      });
    });
  };

  // Handle key events in the search input
  const handleKeyDown = (e) => {
    const isInputFocused = document.activeElement === inputRef.current;
    if (isInputFocused && suggestions.length > 0) {
      const lastIndex = suggestions.length - 1;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex(prevIndex => (prevIndex === null ? 0 : Math.min(prevIndex + 1, lastIndex)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex(prevIndex => (prevIndex === null ? lastIndex : Math.max(prevIndex - 1, 0)));
      } else if (e.key === "Enter" && selectedSuggestionIndex !== null && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        setSearchQuery(suggestions[selectedSuggestionIndex]);
        setSuggestions([]);
      }
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
          />
          <button className="search-button" onClick={handleSearch}>
            <FaSearch />
          </button>
        </div>

        {/* Display autocomplete suggestions */}
        {suggestions.length > 0 && (
          <ul className="autocomplete-list">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion} className="autocomplete-item">
                <button
                  className={`autocomplete-button ${index === selectedSuggestionIndex ? "selected" : ""}`}
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
            <button
              className={`sidebar-button ${sortBy === 'popularity' ? 'selected' : ''}`}
              onClick={handleSortByPopularity}
            >
              Most Popular
            </button>
            <button
              className={`sidebar-button ${sortBy === 'lowStock' ? 'selected' : ''}`}
              onClick={handleSortByLowStock}
            >
              Low Stock
            </button>
          </div>
        </div>

        <ul className="product-list">
          {displayProducts.length > 0 ? (
            displayProducts.map((product) => (
              <ProductBox key={product._id} product={product} />
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
    const productsFilter = locationId ? { "total_stock_sum.location.id": new ObjectId(locationId) } : {};

    const products = await db.collection(collectionName).find(productsFilter).toArray();

    let facets = [];

    if (edge) {
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
                productsFacet: { type: "string", path: "name", numBuckets: 50 },
                itemsFacet: { type: "string", path: "items.name", numBuckets: 50 },
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
