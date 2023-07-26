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
      const sizes = order.items.map((item) => item.size);
      const colors = order.items.map((item) => item.color?.name);

      const sizeMatch = sizesFilter.length === 0 || sizes.some(size => sizesFilter.includes(size));
      const colorMatch = colorsFilter.length === 0 || colors.some(color => colorsFilter.includes(color));

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
     <div className="table-container"> 
    <table className="order-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Order ID</th>
              <th>Name</th>
              <th>SKU</th>
              <th>Size</th>
              <th>Amount</th>
              <th>Placement Date</th>
              <th>Arrival Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              sortedOrders.slice(startIndex, endIndex).map(order => (
                <tr key={order._id} className="order-row">
        
                  <td className="order-icon">
                    <div className="shirt-icon-background" >
                     <FaTshirt style={{ color: order.items[0]?.color?.hex || 'black' }} />
                    </div>
                  </td>
               
                  <td>{order.order_number}</td>
                  <td>{order.items[0]?.product_name}</td>
                  <td>{order.items[0]?.sku}</td>
                  <td>{order.items[0]?.size}</td>
                  <td>{order.items[0]?.amount}</td>
                  <td>{order.items[0]?.status?.[0]?.update_timestamp}</td>
                  <td>{order.items[0]?.status?.[1]?.update_timestamp}</td>
                  <td>
                    {order.items[0]?.status?.find(status => status.name === 'order arrived')?.name || 'order placed'}
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
      
      
      orders = await db.collection("orders").aggregate(searchAgg).toArray();
      } else {
      orders = await db.collection("orders").find({}).toArray();
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
