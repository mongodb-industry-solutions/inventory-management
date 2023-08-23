import { useState, useEffect, useRef } from 'react';
import clientPromise from "../lib/mongodb";
import { FaSearch, FaTshirt } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';


export default function Sales({ sales, facets }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredSales, setFilteredSales] = useState(sales);
    const [sortedSales, setSortedSales] = useState(sales);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Set the number of items per page
    const [currentPage, setCurrentPage] = useState(1); // Set the initial current page to 1

    const lightColors = [
      '#B1FF05','#E9FF99','#B45AF2','#F2C5EE',
      '#00D2FF','#A6FFEC', '#FFE212', '#FFEEA9'
    ];

    // Calculate the total number of pages
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

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
            const response = await fetch(`/api/searchSale?q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            const searchResults = data.results;
            setFilteredSales(searchResults);
            setSortedSales(searchResults);
          } catch (error) {
            console.error(error);
          }
        } else {
          setFilteredSales(sales);
          setSortedSales(sales);
        }
      };

      const handleSearchInputChange = async (e) => {
        const searchValue = e.target.value;
        setSearchQuery(searchValue);
      
        if (searchValue.length > 0) {
          try {
            const response = await fetch(`/api/suggestions_saleshistory?q=${encodeURIComponent(searchValue)}`);
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

      const filterSales = (sizesFilter, colorsFilter) => {
        console.log('Filtering sales with sizes:', sizesFilter, 'and colors:', colorsFilter);
        
        // Filter orders based on sizes and colors
        let updatedFilteredSales = sales.filter(sale => {
          const size = sale.size; // Get the size directly from the sale object
          const color = sale.color.name; // Get the color directly from the sale object
      
          const sizeMatch = sizesFilter.length === 0 || sizesFilter.includes(size);
          const colorMatch = colorsFilter.length === 0 || colorsFilter.includes(color);
      
          return sizeMatch && colorMatch;
        });
      
        setFilteredSales(updatedFilteredSales);
        setSortedSales(updatedFilteredSales); // Update sorted orders when filters change
        console.log('sizes:' + sizesFilter + ' colors:' + colorsFilter + ' orders: ' + updatedFilteredSales.length);
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
      
      
    return(
        <>
            <Sidebar facets={facets} filterSales={filterSales} page="sales"/>
            <div className="content">
            <div className="search-bar">
                <input
                    ref={inputRef}
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
            <table className="order-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Size</th>
              <th>Amount</th>
              <th>Channel</th>
              <th>Sale Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length > 0 ? (
              sortedSales.slice(startIndex, endIndex).map(sale => (
                <tr key={sale._id} className="order-row">

                  <td className="order-icon">
                    <div className="shirt-icon-background" >
                      <FaTshirt style={{ color: sale.color?.hex || '#000000' }} />
                      <img src={lightColors.includes(sale.color?.hex) ? "/images/leaf_dark.png" : "/images/leaf_white.png"} alt="Leaf" className="leaf"/>
                    </div>
                  </td>
                  <td>{sale.sku}</td>
                  <td>{sale.size}</td>
                  <td>{sale.quantity}</td>
                  <td>{sale.channel}</td>
                  <td>{formatTimestamp(sale.timestamp)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No results found</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
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
        </>
    )
}

export async function getServerSideProps() {
    try {

      if (!process.env.MONGODB_DATABASE_NAME) {
        throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
      }

      const dbName = process.env.MONGODB_DATABASE_NAME;
      const client = await clientPromise;
      const db = client.db(dbName);
  
      const agg = [
        {
          $searchMeta: {
            index: "internsmongoretail-salesfacets",
            facet: {
              facets: {
                colorsFacet: { type: "string", path: "color.name", numBuckets: 20 },
                sizesFacet: { type: "string", path: "size" },
              },
            },
          },
        },
      ];
  
      const facets = await db
        .collection("sales")
        .aggregate(agg)
        .toArray();
  
      let sales = await db
        .collection("sales")
        .find({})
        .sort({ timestamp: -1 })
        .toArray();
  
      return {
        props: { sales: JSON.parse(JSON.stringify(sales)), facets: JSON.parse(JSON.stringify(facets)) },
      };
    } catch (e) {
      console.error(e);
      return {
        props: { sales: [] },
      };
    }
  }

  