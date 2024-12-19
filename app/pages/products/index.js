import { clientPromise } from '../../lib/mongodb';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { FaSearch } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import ProductBox from '../../components/ProductBox';
import { ObjectId } from 'bson';
import { useToast } from '@leafygreen-ui/toast';
import { v4 as uuidv4 } from 'uuid';

export default function Products({ products, facets }) {
  // State variables
  const [searchQuery, setSearchQuery] = useState('');
  const [displayProducts, setDisplayProducts] = useState(products);
  const [sortBy, setSortBy] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] =
    useState(null);
  const [previousItems, setPreviousItems] = useState(
    products.flatMap((product) => product.items)
  );

  const sseConnection = useRef(null);
  const sessionId = useRef(uuidv4());
  const collection = 'products';

  const { pushToast } = useToast();
  const router = useRouter();
  const { location } = router.query;
  // Refs
  const inputRef = useRef(null);

  // Function to add a new alert to the list
  const addAlert = (item) => {
    const queryParameters = new URLSearchParams(
      router.query
    ).toString();
    const href = `/products/${item.product_id}?${queryParameters}`;

    pushToast({
      title: (
        <span>
          Item &nbsp;
          <a href={href}>{item.sku}</a>
          &nbsp; is low stock!
        </span>
      ),
      variant: 'warning',
    });
  };

  const listenToSSEUpdates = useCallback(() => {
    console.log(
      'Listening to SSE updates for collection ' + collection
    );
    const eventSource = new EventSource(
      '/api/sse?sessionId=' +
        sessionId.current +
        '&colName=' +
        collection
    );

    eventSource.onopen = () => {
      console.log('SSE connection opened.');
      // Save the SSE connection reference in the state
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.fullDocument) {
        console.log('Change detected');
        setDisplayProducts((prevProducts) =>
          prevProducts.map((product) =>
            product._id === data.fullDocument._id
              ? data.fullDocument
              : product
          )
        );

        // Handle alerts if stock is low
        const pattern = /^items\.(\d+)\.stock/;
        for (const key of Object.keys(
          data.updateDescription.updatedFields
        )) {
          if (pattern.test(key)) {
            const updatedItemIndex = parseInt(
              key.match(pattern)[1],
              10
            );
            const updatedItem =
              data.fullDocument.items[updatedItemIndex];
            const itemStock = updatedItem.stock.find(
              (stock) => stock.location.id == location
            );
            if (
              itemStock?.amount + itemStock?.ordered <
              itemStock?.threshold
            ) {
              addAlert(updatedItem);
            }
          }
        }
      }
    };

    eventSource.onerror = (event) => {
      console.error('SSE Error:', event);
    };

    // Close the previous connection if it exists
    if (sseConnection.current) {
      sseConnection.current.close();
      console.log('Previous SSE connection closed.');
    }

    sseConnection.current = eventSource;

    return eventSource;
  }, []);

  useEffect(() => {
    handleSearch(); // Trigger search whenever the search query changes
  }, [searchQuery]);

  useEffect(() => {
    setDisplayProducts(products); // Update displayed products when router path changes
    const eventSource = listenToSSEUpdates();

    return () => {
      if (eventSource) {
        eventSource.close();
        console.log('SSE connection closed.');
      }
    };
  }, [router.asPath, listenToSSEUpdates]);

  // Function to handle changes in the search bar
  const handleSearch = async () => {
    if (searchQuery.trim().length > 0) {
      // Avoid empty space triggering a fetch
      try {
        const response = await fetch(
          '/api/search?collection=products',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(searchQuery),
          }
        );

        const data = await response.json();
        setDisplayProducts(
          Array.isArray(data.documents) ? data.documents : []
        ); // Ensure it's an array
      } catch (error) {
        console.error('Search error:', error);
        setDisplayProducts([]); // Fallback to empty array on error
      }
    } else {
      setDisplayProducts(products); // Default to original products
    }
  };

  // Function to handle input changes in the search bar and provide suggestions
  const handleSearchInputChange = async (e) => {
    const searchValue = e.target.value;
    setSearchQuery(searchValue);

    if (searchValue.trim().length > 0) {
      // Avoid spaces triggering a fetch
      try {
        const response = await fetch(
          '/api/autocomplete?collection=products',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(searchValue),
          }
        );

        const data = await response.json();
        const suggestions = data.documents?.[0]?.suggestions || []; // Safe access
        setSuggestions(suggestions);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([]); // Fallback to empty suggestions
      }
    } else {
      setSuggestions([]);
    }
    setSelectedSuggestionIndex(-1);
  };

  // Function to filter products based on selected items and products
  const filterProducts = (itemsFilter, productsFilter) => {
    const updatedFilteredProducts = products.filter((product) => {
      const items = product.items.map((item) => item.name);
      const products = product.name ? [product.name] : [];

      const itemMatch =
        itemsFilter.length === 0 ||
        items.some((i) => itemsFilter.includes(i));
      const productMatch =
        productsFilter.length === 0 ||
        products.some((p) => productsFilter.includes(p));

      return itemMatch && productMatch;
    });
    setDisplayProducts(updatedFilteredProducts);
  };

  // Function to handle sorting by popularity
  const handleSortByPopularity = () => {
    console.log('Sorting by popularity');
    setSortBy('popularity');
    setDisplayProducts((prevProducts) =>
      [...prevProducts].sort(
        (a, b) => b.popularity_index - a.popularity_index
      )
    );
  };

  // Function to handle sorting by low stock
  const handleSortByLowStock = () => {
    console.log('Sorting by low stock');
    setSortBy('lowStock');
    setDisplayProducts((prevProducts) => {
      return [...prevProducts].sort((a, b) => {
        const countLowStockSizes = (product) => {
          if (location) {
            return product.items.reduce(
              (count, item) =>
                item.stock.find(
                  (stock) => stock.location.id === location
                )?.amount < 10
                  ? count + 1
                  : count,
              0
            );
          } else {
            return product.items.reduce(
              (count, item) =>
                item.stock.find(
                  (stock) => stock.location.type !== 'warehouse'
                )?.amount < 10
                  ? count + 1
                  : count,
              0
            );
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
              return product.items.reduce(
                (total, item) =>
                  total +
                  item.stock.find(
                    (stock) => stock.location.id === location
                  )?.amount,
                0
              );
            } else {
              return product.items.reduce(
                (total, item) =>
                  total +
                  item.stock.find(
                    (stock) => stock.location.type !== 'warehouse'
                  )?.amount,
                0
              );
            }
          };

          return totalStockAmount(a) - totalStockAmount(b);
        }
      });
    });
  };

  // Handle key events in the search input
  const handleKeyDown = (e) => {
    const isInputFocused =
      document.activeElement === inputRef.current;
    if (isInputFocused && suggestions.length > 0) {
      const lastIndex = suggestions.length - 1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prevIndex) =>
          prevIndex === null ? 0 : Math.min(prevIndex + 1, lastIndex)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prevIndex) =>
          prevIndex === null ? lastIndex : Math.max(prevIndex - 1, 0)
        );
      } else if (
        e.key === 'Enter' &&
        selectedSuggestionIndex !== null &&
        selectedSuggestionIndex >= 0
      ) {
        e.preventDefault();
        setSearchQuery(suggestions[selectedSuggestionIndex]);
        setSuggestions([]);
      }
    }
  };

  return (
    <>
      <div className="content">
        <Sidebar
          facets={facets}
          filterProducts={filterProducts}
          page="products"
        />
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
                  className={`autocomplete-button ${
                    index === selectedSuggestionIndex
                      ? 'selected'
                      : ''
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
            <button
              className={`sidebar-button ${
                sortBy === 'popularity' ? 'selected' : ''
              }`}
              onClick={handleSortByPopularity}
            >
              Most Popular
            </button>
            <button
              className={`sidebar-button ${
                sortBy === 'lowStock' ? 'selected' : ''
              }`}
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
      throw new Error(
        'Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"'
      );
    }

    const dbName = process.env.MONGODB_DATABASE_NAME;
    const locationId = query.location;
    const client = await clientPromise;
    const db = client.db(dbName);
    const collectionName = locationId
      ? 'products'
      : 'products_area_view';
    const productsFilter = locationId
      ? { 'total_stock_sum.location.id': new ObjectId(locationId) }
      : {};

    const products = await db
      .collection(collectionName)
      .find(productsFilter)
      .toArray();

    let facets = [];

    const agg = [
      {
        $searchMeta: {
          index: 'facets',
          facet: {
            facets: {
              productsFacet: {
                type: 'string',
                path: 'name',
                numBuckets: 50,
              },
              itemsFacet: {
                type: 'string',
                path: 'items.name',
                numBuckets: 50,
              },
            },
          },
        },
      },
    ];

    facets = await db.collection('products').aggregate(agg).toArray();

    return {
      props: {
        products: JSON.parse(JSON.stringify(products)),
        facets: JSON.parse(JSON.stringify(facets)),
      },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { products: [] },
    };
  }
}
