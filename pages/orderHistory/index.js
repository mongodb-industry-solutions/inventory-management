import clientPromise from "../../lib/mongodb";
import { useState, useEffect } from 'react';
import { FaSearch, FaTshirt } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';
import Fuse from 'fuse.js';

export default function Orders({ orders, facets }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOrders, setFilteredOrders] = useState(orders);
  const [sortedOrders, setSortedOrders] = useState(orders);

  const handleSearch = () => {
    if (searchQuery.length > 0) {
      const options = {
        keys: ['order_number', 'items[0].product_name'], // Adjust the keys based on the fields in the new search index
        includeScore: true,
        threshold: 0.4,
      };
  
      const fuse = new Fuse(orders, options);
      const searchResults = fuse.search(searchQuery).map(result => result.item);
      setFilteredOrders(searchResults);
    } else {
      setFilteredOrders(orders);
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
      // Perform filtering logic based on sizes and colors
      // ...
    });
    setFilteredOrders(updatedFilteredOrders);
    setSortedOrders(updatedFilteredOrders); // Update sorted orders when filters change
    console.log('sizes:' + sizesFilter + ' colors:' + colorsFilter + ' orders: ' + updatedFilteredOrders.length);
  };

  return (
    <>
      <Sidebar facets={facets} filterOrders={filterOrders} />
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

        <ul className="order-list">
          {filteredOrders.length > 0 ? (
            sortedOrders.map(order => (
              <li key={order._id} className="order-item">
                <div className="order-info">
                <p>Order ID: {order.order_number}</p>
                <p>Name: {order.items[0]?.product_name}</p>
          <p>SKU: {order.items[0]?.sku}</p>
          <p>Size: {order.items[0]?.size}</p>
          <p>Amount: {order.items[0]?.amount}</p>
          <p>Placement Date: {order.location.placement_timestamp}</p>
          <p>Arrival Date: {order.status && order.status.find(status => status.name === 'order arrived')?.update_timestamp}</p>
          <p>Status: {order.status && order.status[0]?.name}</p>



          

     
                </div>
              </li>
            ))
          ) : (
            <li>No results found</li>
          )}
        </ul>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  try {
    const client = await clientPromise;
    const db = client.db("interns_mongo_retail");

    const agg = [
      {
        $searchMeta: {
          index: "internsmongoretail-productfacets",
          facet: {
            facets: {
              colorsFacet: { type: "string", path: "color.name" },
              sizesFacet: { type: "string", path: "items.size" },
            },
          },
        },
      },
    ];

    const facets = await db
      .collection("products")
      .aggregate(agg)
      .toArray();

    let orders = await db
      .collection("orders")
      .find({})
      .toArray();

    return {
      props: { orders: JSON.parse(JSON.stringify(orders)), facets: JSON.parse(JSON.stringify(facets)) },
    };
  } catch (e) {
    console.error(e);
    return {
      props: { orders: [] },
    };
  }
}
