import { clientPromise, edgeClientPromise } from "../../lib/mongodb";
import { useState, useEffect, useRef, useContext } from 'react';
import { ObjectId } from 'mongodb';
import { useRouter } from 'next/router';
import { useUser } from '../../context/UserContext';
import { ServerContext } from '../_app';
import { FaSearch, FaTshirt, FaWhmcs } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import { autocompleteTransactionsPipeline } from '../../data/aggregations/autocomplete';
import { searchTransactionsPipeline } from '../../data/aggregations/search';
import { facetsTransactionsPipeline } from '../../data/aggregations/facets';
import { fetchTransactionsPipeline } from "../../data/aggregations/fetch";

export default function Transactions({ orders, facets }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [displayOrders, setDisplayOrders] = useState(orders);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Set the number of items per page
  const [currentPage, setCurrentPage] = useState(1); // Set the initial current page to 1
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  const lightColors = [
    '#B1FF05','#E9FF99','#B45AF2','#F2C5EE',
    '#00D2FF','#A6FFEC', '#FFE212', '#FFEEA9'
  ];

  // Calculate the total number of pages
  const totalPages = Math.ceil(displayOrders.length / itemsPerPage);

  const { selectedUser } = useUser();
  const utils = useContext(ServerContext);

  const router = useRouter();
  const { location, type, edge } = router.query;

  useEffect(() => {
    handleSearch();
  }, [searchQuery, router.asPath]);

  // Function to handle pagination control clicks
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calculate the start and end index for items to display on the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Create refs for the input element and suggestions list
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const handleSearch = async () => {
    if (searchQuery.length > 0) {
      try {
        let response;
        if (edge === 'true') {
          response = await fetch(`/api/edge/search?collection=transactions&type=${type}&location=${location}&industry=${utils.demoInfo.demoIndustry}`, {
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
              collection: 'transactions',
              pipeline: searchTransactionsPipeline(searchQuery, location, type)
            }),
          });
        }
        
        const data = await response.json();
        const searchResults = data.documents;
        
        setDisplayOrders(searchResults);
      } catch (error) {
        console.error(error);
      }
    } else {
      setDisplayOrders(orders);
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
            collection: 'transactions',
            pipeline: autocompleteTransactionsPipeline(searchValue)
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
  

  const filterOrders = (itemsFilter, productsFilter) => {
    // Filter orders based on sizes and colors
    let updatedFilteredOrders = orders.filter(order => {
      const item = order.items?.name;
      const product = order.items?.product?.name;

      const itemMatch = itemsFilter.length === 0 || itemsFilter.includes(item);
      const productMatch = productsFilter.length === 0 || productsFilter.includes(product);

      return itemMatch && productMatch;
    });

    setDisplayOrders(updatedFilteredOrders); // Update displayed orders when filters change
    console.log('sizes:' + itemsFilter + ' colors:' + productsFilter + ' orders: ' + updatedFilteredOrders.length);
  };

  const handleInputKeyUp = (e) => {
    // Listen for the keyup event and clear the suggestions if the input value is empty
    if (e.target.value === '') {
      setSuggestions([]);
    }
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

  const handleSave = async () => {
    setSaveSuccessMessage(true);
    await new Promise((resolve) => setTimeout(resolve, 4000));
    setSaveSuccessMessage(false);
  };

  const handleReorder = async (item) => {

    //find location that match location query 
    const selectedLocation = selectedUser?.permissions?.locations.find(s => s.id === location);

    const transaction = {
      type: 'inbound',
      user_id: selectedUser?._id,
      location: {
        origin: {
            type: 'warehouse'
        },
        destination: {
            type: 'store',
            id: selectedLocation?.id,
            name: selectedLocation?.name,
            area_code: selectedLocation?.area_code
        }
      },
      placement_timestamp: '',
      items: []
    };

    item.status = [];
    transaction.items.push(item);
    
    try {
        const response = await fetch(utils.apiInfo.httpsUri + '/addTransaction', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(transaction),
          });
        if (response.ok) {
            handleSave();
        } else {
            console.log('Error saving order');
        }
    } catch (e) {
        console.error(e);
    }
};

function formatTimestamp(timestamp) {
  if (!timestamp) return ""; // Handle cases where timestamp is missing or undefined

  const date = new Date(timestamp);

  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  };

  return date.toLocaleString('en-US', options); // Format the date for display
}



  return (
    <>
      <Sidebar facets={facets} filterOrders={filterOrders} page="orders"/>
      <div className="content">

      <div className="search-bar">
          <input
            ref={inputRef} // Attach the ref to the input element
            className="search-input"
            type="text"
            placeholder=" Search..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            onKeyDown={handleKeyDown} // Add the onKeyDown event handler
            onKeyUp={handleInputKeyUp}
          />
          <button className="search-button" onClick={handleSearch}>
            <FaSearch />
          </button>
        </div>

        {/* Display autocomplete suggestions */}
        {suggestions.length > 0 && (
          <ul className="autocomplete-list" ref={suggestionsRef} tabIndex={0} onKeyDown={handleKeyDown}>
            {suggestions.map((suggestion, index) => (
              <li key={suggestion} className="autocomplete-item">
                <button
                  className={`autocomplete-button ${
                    index === selectedSuggestionIndex ? "selected" : ""
                  }`}
                  onClick={() => {
                    setSearchQuery(suggestion);
                    setSuggestions([]); // Hide the suggestions
                  }}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}
     <div className="table-container" > 
    <table className="order-table" >
          <thead>
            <tr>
            <th style={{ width: '10%' }}>Item</th>
            <th style={{ width: '5%' }}>Transaction ID</th>
            <th style={{ width: '12%' }}>Product</th>
            <th style={{ width: '7%' }}>SKU</th>
            <th style={{ width: '5%' }}>Item</th>
            <th style={{ width: '5%' }}>Amount</th>
            {!location && type === 'inbound' && (<th style={{ width: '5%' }}>Location</th>)}
            <th style={{ width: '12%' }}>Placement Date</th>
            <th style={{ width: '12%' }}>Arrival Date</th>
            <th style={{ width: '5%' }}>Status</th>
            {location && type === 'inbound' && (<th style={{ width: '5%' }}></th>)}
            </tr>
          </thead>
          <tbody>
            {displayOrders.length > 0 ? (
              displayOrders.slice(startIndex, endIndex).map(order => (
                  <tr key={order._id + order.items.sku} className="order-row">
                    <td className="order-icon">
                      <div className="shirt-icon-background" >
                        {
                          order.items?.product?.image?.url ? 
                            (
                                <img 
                                    src={ order.items?.product?.image?.url } 
                                    alt="Product Image" 
                                    className="product-image"
                                    onError={() => setImageErrors(prevErrors => ({ ...prevErrors, [orderItemId]: true }))}
                                />
                            ) :
                            (
                                utils.demoInfo.industry == 'manufacturing' ?
                                    (
                                        <FaWhmcs color="grey" className="default-icon"/>
                                    ) :
                                    (
                                        <>
                                            <FaTshirt style={{ color: order.items?.product.color?.hex || 'black' }} />
                                            <img src={lightColors.includes(order.items?.product.color?.hex) ? "/images/leaf_dark.png" : "/images/leaf_white.png"} alt="Leaf" className="leaf"/>
                                        </>
                                    )
                            )
                              
                        }
                      </div>
                    </td>
                
                    <td>{order.transaction_number}</td>
                    <td>{order.items?.product.name}</td>
                    <td>{order.items?.sku}</td>
                    <td>{order.items?.name}</td>
                    <td>{Math.abs(order.items?.amount)}</td>
                    {!location && type === 'inbound' && (<td>{order.location?.destination?.name.split(' ')[0]}</td>)}
                    <td>{formatTimestamp(order.items?.status?.slice().sort((a, b) => new Date(a.update_timestamp) - new Date(b.update_timestamp))[0]?.update_timestamp)}</td>
                    <td>{formatTimestamp(order.items?.status?.slice().sort((a, b) => new Date(b.update_timestamp) - new Date(a.update_timestamp))[0]?.update_timestamp)}</td>
                    <td>{order.items?.status?.slice().sort((a, b) => new Date(b.update_timestamp) - new Date(a.update_timestamp))[0]?.name}</td>
                    {location && type === 'inbound' && (<td>
                      <button className="reorder-button" onClick={() => handleReorder(order.items)}>Reorder</button>
                    </td>)}
                  </tr>
                )
              )
            ) : (
              <tr>
                <td colSpan="8">No results found</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="pagination">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            className={pageNumber === currentPage ? 'active' : ''}
            onClick={() => handlePageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
      </div>

        </div>
        {saveSuccessMessage && (
            <div style={{ position: 'fixed', top: 134, right: 34, background: '#C7ECC2', color: '#1A6510', padding: '10px', animation: 'fadeInOut 0.5s'}}>
                Order placed successfully
            </div>
        )}
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  
  try {
    if (!process.env.MONGODB_DATABASE_NAME) {
      throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
    }
    if (!process.env.DEMO_INDUSTRY) {
      throw new Error('Invalid/Missing environment variables: "DEMO_INDUSTRY"')
    }

    const dbName = process.env.MONGODB_DATABASE_NAME;
    const industry = process.env.DEMO_INDUSTRY;

    const { query } = context;
    const type = query.type;
    const location = query.location;
    const edge = (query.edge === 'true');

    const client = edge ? await edgeClientPromise : await clientPromise;
    const db = client.db(dbName);

    let transactions = [];
    let facets = [];

    if (edge) {

      // Fetch transactions edge
      const locationFilter = location
        ? type === 'inbound'
          ? { 'location.destination.id': new ObjectId(location) }
          : { 'location.origin.id': new ObjectId(location) }
        : {};

      const manufacturingFilter =
        industry === 'manufacturing'
          ? type === 'inbound'
            ? { 'items.product.name': { $ne: "Finished Goods" } }
            : { 'items.product.name': "Finished Goods" }
          : {};

      const transactionGroup = await db
        .collection("transactions")
        .find({
          ...locationFilter,
          ...manufacturingFilter,
        })
        .sort({'items.status.0.update_timestamp': -1})
        .toArray();
      
      if (transactionGroup.length > 0) {
        transactions = transactionGroup.flatMap(transaction =>
          transaction.items.map(item => ({ ...transaction, items: item }))
        );
      }

      // Fetch filter facets edge
      const itemsAggregated = transactions.flatMap(transaction => transaction.items.name);
      const productsAggregated = transactions.map(transaction => transaction.items.product.name);
      
      const itemsFacetBuckets = Array.from(new Set(itemsAggregated)).map(item => ({
        _id: item,
        count: itemsAggregated.filter(i => i === item).length,
      }));
      
      const productsFacetBuckets = Array.from(new Set(productsAggregated)).map(product => ({
        _id: product,
        count: productsAggregated.filter(p => p === product).length,
      }));
      
      const facetGroup = {
        facet: {
          itemsFacet: { buckets: itemsFacetBuckets },
          productsFacet: { buckets: productsFacetBuckets },
        },
      };

      facets.push(facetGroup);

    } else {

      // Fetch transactions
      const agg = fetchTransactionsPipeline(industry, location, type);

      transactions = await db
        .collection("transactions")
        .aggregate(agg)
        .toArray();

      // Fetch filter facets
      const facetsAgg = facetsTransactionsPipeline(industry, type);

      facets = await db
        .collection("transactions")
        .aggregate(facetsAgg)
        .toArray();
    }
    

    return {
      props: { orders: JSON.parse(JSON.stringify(transactions)), facets: JSON.parse(JSON.stringify(facets)) },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { orders: [] },
    };
  }
}
