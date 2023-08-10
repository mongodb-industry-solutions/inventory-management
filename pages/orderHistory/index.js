import clientPromise from "../../lib/mongodb";
import { useState, useEffect, useRef } from 'react';
import { FaSearch, FaTshirt } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';

export default function Orders({ orders, facets }) {
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
  
  useEffect(() => {
    handleSearch();
  }, [searchQuery]);
  

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

    const order = {
      user_id: {
          $oid: '649ef73a7827d12200b87895'
      },
      location: {
          origin: 'warehouse',
          destination: 'store'
      },
      placement_timestamp: '',
      items: []
  };

    order.items.push(item);
    
    try {
        const response = await fetch('/api/createOrder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order }),
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
            <th style={{ width: '15%' }}>Item</th>
            <th style={{ width: '5%' }}>Order ID</th>
            <th style={{ width: '10%' }}>Name</th>
            <th style={{ width: '10%' }}>SKU</th>
            <th style={{ width: '5%' }}>Size</th>
            <th style={{ width: '5%' }}>Amount</th>
            <th style={{ width: '17.5%' }}>Placement Date</th>
            <th style={{ width: '17.5%' }}>Arrival Date</th>
            <th style={{ width: '5%' }}>Status</th>
            <th style={{ width: '5%' }}></th>

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
                  <td>{order.items?.product_name}</td>
                  <td>{order.items?.sku}</td>
                  <td>{order.items?.size}</td>
                  <td>{order.items?.amount}</td>
                  <td>{order.items?.status?.[0]?.update_timestamp}</td>
                  <td>{order.items?.status?.[1]?.update_timestamp}</td>
                  <td>
                    {order.items?.status?.find(status => status.name === 'arrived')?.name || 'placed'}
                  </td>
                  <td>
                    <button className="reorder-button" onClick={() => handleReorder(order.items)}>Reorder</button>
                  </td>
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
            <div style={{ position: 'fixed', bottom: 34, right: 34, background: '#00684bc4', color: 'white', padding: '10px', animation: 'fadeInOut 0.5s'}}>
                Order placed successfully
            </div>
        )}
      </div>
    </>
  );
}

export async function getServerSideProps({ query }) {
  try {
    const client = await clientPromise;
    const db = client.db("interns_mongo_retail");
    const searchQuery = query.q || '';

    let orders;

    const unwind = [
      {
        '$unwind': {
          'path': '$items'
        }
      }
    ];

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
      },{
        '$unwind': {
          'path': '$items'
        }
      }
      ];
      
      

      orders = await db.collection("orders").aggregate(searchAgg).toArray();
      } else {
      orders = await db.collection("orders").aggregate(unwind).toArray();
      }
      



    const agg = [
      {
        $searchMeta: {
          index: "internsmongoretail-ordersfacets",
          facet: {
            facets: {
              colorsFacet: { type: "string", path: "items.color.name" },
              sizesFacet: { type: "string", path: "items.size" },
            },
          },
        },
      },
    ];

    const facets = await db
      .collection("orders")
      .aggregate(agg)
      .toArray();

  

    return {
      props: { orders: JSON.parse(JSON.stringify(orders)), facets: JSON.parse(JSON.stringify(facets)), page: 'orders', },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { orders: [] },
    };
  }
}
