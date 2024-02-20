import clientPromise from "../../lib/mongodb";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { ObjectId } from 'mongodb';
import { useUser } from '../../context/UserContext';
import { FaSearch, FaTshirt } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';

export default function Transactions({ orders, facets }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOrders, setFilteredOrders] = useState(orders);
  const [sortedOrders, setSortedOrders] = useState(orders);
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
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const { selectedUser } = useUser();
  const router = useRouter();
  const { location } = router.query;

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
        const response = await fetch(`/api/searchOrder?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        const searchResults = data.results;
        setFilteredOrders(searchResults);
        setSortedOrders(searchResults);
      } catch (error) {
        console.error(error);
      }
    } else {
      setFilteredOrders(orders);
      setSortedOrders(orders);
    }
  };
  

  const handleSearchInputChange = async (e) => {
    const searchValue = e.target.value;
    setSearchQuery(searchValue);
  
    if (searchValue.length > 0) {
      try {
        const response = await fetch(`/api/suggestions_orderhistory?q=${encodeURIComponent(searchValue)}`);
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
  

  const filterOrders = (sizesFilter, colorsFilter) => {
    // Filter orders based on sizes and colors
    let updatedFilteredOrders = orders.filter(order => {
      const size = order.items.size;
      const color = order.items.color?.name;

      const sizeMatch = sizesFilter.length === 0 || sizesFilter.includes(size);
      const colorMatch = colorsFilter.length === 0 || colorsFilter.includes(color);

      return sizeMatch && colorMatch;
    });

    setFilteredOrders(updatedFilteredOrders);
    setSortedOrders(updatedFilteredOrders); // Update sorted orders when filters change
    console.log('sizes:' + sizesFilter + ' colors:' + colorsFilter + ' orders: ' + updatedFilteredOrders.length);
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
        const response = await fetch('/api/addTransaction', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(transaction),
          });
        if (response.ok) {
            handleSave();

            const fetchPromises = [];

            const data = await response.json();
            const orderId = data.orderId;

            //Move to store
            for (let i = 0; i < order.items?.length; i++) {
                let item = order.items[i];

                try {
                    fetchPromises.push(fetch(`/api/moveToStore?order_id=${orderId}`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ item }),
                      }));
                    if (response.ok) {
                        //console.log(item.sku + ' moved to store successfully.');
                    } else {
                        console.log('Error moving to store item ' + item.sku + '.');
                    }
                } catch (e) {
                    console.error(e);
                }
            }
            await Promise.all(fetchPromises);

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
            {!location && (<th style={{ width: '5%' }}>Store</th>)}
            <th style={{ width: '12%' }}>Placement Date</th>
            <th style={{ width: '12%' }}>Arrival Date</th>
            <th style={{ width: '5%' }}>Status</th>
            {location && (<th style={{ width: '5%' }}></th>)}
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              sortedOrders.slice(startIndex, endIndex).map(order => (
                <tr key={order._id + order.items.sku} className="order-row">
        
                  <td className="order-icon">
                    <div className="shirt-icon-background" >
                     <FaTshirt style={{ color: order.items?.color?.hex || 'black' }} />
                     <img src={lightColors.includes(order.items?.color?.hex) ? "/images/leaf_dark.png" : "/images/leaf_white.png"} alt="Leaf" className="leaf"/>
                    </div>
                  </td>
               
                  <td>{order.order_number}</td>
                  <td>{order.items?.product.name}</td>
                  <td>{order.items?.sku}</td>
                  <td>{order.items?.name}</td>
                  <td>{order.items?.amount}</td>
                  {!location && (<td>{order.location?.destination?.name.split(' ')[0]}</td>)}
                  <td>{formatTimestamp(order.items?.status?.slice().sort((a, b) => new Date(a.update_timestamp) - new Date(b.update_timestamp))[0]?.update_timestamp)}</td>
                  <td>{formatTimestamp(order.items?.status?.slice().sort((a, b) => new Date(b.update_timestamp) - new Date(a.update_timestamp))[0]?.update_timestamp)}</td>
                  <td>{order.items?.status?.slice().sort((a, b) => new Date(b.update_timestamp) - new Date(a.update_timestamp))[0]?.name}</td>
                  {location && (<td>
                    <button className="reorder-button" onClick={() => handleReorder(order.items)}>Reorder</button>
                  </td>)}
                </tr>
              ))
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

    const dbName = process.env.MONGODB_DATABASE_NAME;
    const client = await clientPromise;
    const db = client.db(dbName);

    const { query } = context;
    const type = query.type;
    const locationId = query.location;

    const agg = [
        {
          '$match': {
            'type': type
          }
        }, {
          '$unwind': {
            'path': '$items'
          }
        }, {
          '$sort': {
            'items.status.0.update_timestamp': -1
          }
        }
      ];
      

    if (locationId) {

        var locationFilter;
        if ( type === 'inbound') {
            locationFilter = {
                $match: {
                    'location.destination.id': new ObjectId(locationId)
                }
            };
        } else {
            locationFilter = {
                $match: {
                    'location.origin.id': new ObjectId(locationId)
                }
            };
        }
        agg.unshift(locationFilter);
    }

    const transactions = await db
      .collection("transactions")
      .aggregate(agg)
      .toArray();

    const facetsAgg = [
      {
        $searchMeta: {
          index: "facets",
          facet: {
            facets: {
              colorsFacet: { type: "string", path: "items.color.name", numBuckets: 20 },
              sizesFacet: { type: "string", path: "items.size" },
            },
          },
        },
      },
    ];

    const facets = await db
      .collection("transactions")
      .aggregate(facetsAgg)
      .toArray();

    return {
      props: { orders: JSON.parse(JSON.stringify(transactions)), facets: JSON.parse(JSON.stringify(facets)), page: 'orders', },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { orders: [] },
    };
  }
}
