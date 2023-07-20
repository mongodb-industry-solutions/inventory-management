import clientPromise from "../../lib/mongodb";
import { useState, useEffect } from 'react';
import { FaSearch, FaTshirt } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';

export default function Orders({ orders, facets }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOrders, setFilteredOrders] = useState(orders);
  const [sortedOrders, setSortedOrders] = useState(orders);

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
  
  
  
  const handleSearchInputChange = (e) => {
    const searchValue = e.target.value;
    setSearchQuery(searchValue);
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

  return (
    <>
      <Sidebar facets={facets} filterOrders={filterOrders} page="orders"/>
      <div className="content">
      <div className="search-bar">
          <input
            className="search-input"
            type="text"
            placeholder=" Search..."
            value={searchQuery}
            onChange={handleSearchInputChange}
          />
          <button className="search-button" onClick={handleSearch}>
            <FaSearch />
          </button>
        </div>
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
              sortedOrders.map(order => (
                <tr key={order._id} className="order-row">
        
                  <td className="order-icon"><FaTshirt style={{ color: order.items[0]?.color?.hex || 'black' }} /></td>
               
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

