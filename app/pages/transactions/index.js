import { getClientPromise } from "../../lib/mongodb"; // Removed getEdgeClientPromise
import { useState, useEffect, useRef, useContext } from 'react';
import { ObjectId } from 'mongodb';
import { useRouter } from 'next/router';
import { useUser } from '../../context/UserContext';
import { ServerContext } from '../_app';
import { FaSearch, FaTshirt, FaWhmcs } from 'react-icons/fa';
import { useToast } from '@leafygreen-ui/toast';
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const lightColors = [
    '#B1FF05','#E9FF99','#B45AF2','#F2C5EE',
    '#00D2FF','#A6FFEC', '#FFE212', '#FFEEA9', '#ffffff', '#FFFFFF'
  ];

  const totalPages = Math.ceil(displayOrders.length / itemsPerPage);

  const { selectedUser } = useUser();
  const utils = useContext(ServerContext);

  const router = useRouter();
  const { location, type } = router.query;

  const { pushToast } = useToast();

  useEffect(() => {
    handleSearch();
  }, [searchQuery, router.asPath]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const handleSearch = async () => {
    if (searchQuery.length > 0) {
      try {
        const response = await fetch(`/api/edge/search?collection=transactions&type=${type}&location=${location}&industry=${utils.demoInfo.demoIndustry}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(searchQuery),
        });
        
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
        const response = await fetch(`/api/edge/autocomplete?collection=transactions&type=${type}&location=${location}&industry=${utils.demoInfo.demoIndustry}`, {
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
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }

    setSelectedSuggestionIndex(-1);
  };
  

  const filterOrders = (itemsFilter, productsFilter) => {
    let updatedFilteredOrders = orders.filter(order => {
      const item = order.items?.name;
      const product = order.items?.product?.name;

      const itemMatch = itemsFilter.length === 0 || itemsFilter.includes(item);
      const productMatch = productsFilter.length === 0 || productsFilter.includes(product);

      return itemMatch && productMatch;
    });

    setDisplayOrders(updatedFilteredOrders);
    console.log('sizes:' + itemsFilter + ' colors:' + productsFilter + ' orders: ' + updatedFilteredOrders.length);
  };

  const handleInputKeyUp = (e) => {
    if (e.target.value === '') {
      setSuggestions([]);
    }
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

  const handleReorder = async (originalItem) => {
    const item = JSON.parse(JSON.stringify(originalItem));

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
        const response = await fetch('/api/edge/addTransaction', { // Simplified URL without `edge` conditional
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(transaction),
          });
        if (response.ok) {
          pushToast({title: "Order placed successfully", variant: "success"});
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

  return date.toLocaleString('en-US', options);
}

  return (
    <>
      <div className="content">
      <Sidebar facets={facets} filterOrders={filterOrders} page="orders"/>
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
                    setSuggestions([]);
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
              displayOrders.slice(startIndex, endIndex).map(order => { 
                const latestStatus = order.items?.status?.slice().sort((a, b) => new Date(b.update_timestamp) - new Date(a.update_timestamp))[0]?.name;

                return (
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
                    <td><span className={latestStatus}>{latestStatus}</span></td>
                    {location && type === 'inbound' && (<td>
                      <button className="reorder-button" onClick={() => handleReorder(order.items)}>Reorder</button>
                    </td>)}
                  </tr>
                )}
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
    const industry = process.env.DEMO_INDUSTRY || 'retail';

    const { query } = context;
    const type = query.type;
    const location = query.location;

    const client = await getClientPromise();
    const db = client.db(dbName);

    const agg = fetchTransactionsPipeline(industry, location, type);
    const transactions = await db.collection("transactions").aggregate(agg).toArray();

    const facetsAgg = facetsTransactionsPipeline(industry, type);
    const facets = await db.collection("transactions").aggregate(facetsAgg).toArray();

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
