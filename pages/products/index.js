import clientPromise from "../../lib/mongodb";
import { useState, useEffect, useRef } from 'react';
import { FaSearch, FaTshirt } from 'react-icons/fa';
import Sidebar from '../../components/Sidebar';

export default function Products({ products, facets }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [sortedProducts, setSortedProducts] = useState(products);
  const [sortBy, setSortBy] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(null);
  
  // Create a ref for the input element
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  const handleSearch = async () => {
    if (searchQuery.length > 0) {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        const searchResults = data.results;
        setFilteredProducts(searchResults);
        setSortedProducts(searchResults);
      } catch (error) {
        console.error(error);
      }
    } else {
      setFilteredProducts(products);
      setSortedProducts(products);
    }
  };
  

  const handleSearchInputChange = async (e) => {
    const searchValue = e.target.value;
    setSearchQuery(searchValue);
  
    if (searchValue.length > 0) {
      try {
        const response = await fetch(`/api/suggestions?q=${encodeURIComponent(searchValue)}`);
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

  
  
  

  useEffect(() => {
    handleSearch();
    setSortedProducts(filteredProducts);
  }, [searchQuery]);

  const filterProducts = (sizesFilter, colorsFilter) => {
    // Filter products based on sizes and colors
    let updatedFilteredProducts = products.filter(product => {
      const sizes = product.items.map((item) => item.size);
      const colors = product.color ? [product.color.name] : [];

      const sizeMatch = sizesFilter.length === 0 || sizes.some(size => sizesFilter.includes(size));
      const colorMatch = colorsFilter.length === 0 || colors.some(color => colorsFilter.includes(color));

      return sizeMatch && colorMatch;
    });
    setFilteredProducts(updatedFilteredProducts);
    setSortedProducts(updatedFilteredProducts); // Update sorted products when filters change
    console.log('sizes:' + sizesFilter + ' colors:' + colorsFilter + ' products: ' + updatedFilteredProducts.length);
  };

  const handleSortByPopularity = () => {
    console.log('Sorting by popularity');
    setSortBy('popularity');
    setSortedProducts(prevProducts => [...prevProducts].sort((a, b) => b.popularity_index - a.popularity_index));
  };

  const handleSortByLowStock = () => {
    console.log('Sorting by low stock');
    setSortBy('lowStock');
    setSortedProducts(prevProducts =>
      [...prevProducts].sort((a, b) => {
        const totalStockSumA = a.total_stock_sum.find(stock => stock.location === 'store');
        const totalStockSumB = b.total_stock_sum.find(stock => stock.location === 'store');
  
        if (!totalStockSumA && !totalStockSumB) {
          return 0;
        }
        if (!totalStockSumA) {
          return 1;
        }
        if (!totalStockSumB) {
          return -1;
        }
  
        if (totalStockSumA.amount === totalStockSumB.amount) {
          return totalStockSumA.location.localeCompare(totalStockSumB.location);
        }
  
        return totalStockSumA.amount - totalStockSumB.amount;
      })
    );
  };
  
  
  

  console.log('Filtered products:', filteredProducts);

  return (
    <>
      <Sidebar facets={facets} filterProducts={filterProducts} page="products"/>
      <div className="content">
        <div className="search-bar">
          <input
            ref={inputRef} // Attach the ref to the input element
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
           { suggestions.length > 0 && (
  <ul className="autocomplete-list" ref={suggestionsRef} tabIndex={0} onKeyDown={handleKeyDown}>
    { suggestions.map((suggestion, index) => (
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



        <div className="order-by-container">
          <p className="order-by-text">Order by:</p>
          <div className="buttons">
            <button className={`sidebar-button ${sortBy === 'popularity' ? 'selected' : ''}`} onClick={handleSortByPopularity}>Most Popular</button>
            <button className={`sidebar-button ${sortBy === 'lowStock' ? 'selected' : ''}`} onClick={handleSortByLowStock}>Low on Stock Items</button>
          </div>
        </div>

        <ul className="product-list">
  {filteredProducts.length > 0 ? (
    sortedProducts.map((product) => (
      <li key={product._id} className="product-item">
        <a href={`/products/${product._id}`} className="product-link">
          <div className="shirt_icon">
            <FaTshirt color={product.color.hex} />
          </div>
          <div className="product-info">
            <div className="name-price-wrapper">
              <div className="name-wrapper">
                <h2>{product.name}</h2>
                <h3>{product.code}</h3>
              </div>
              <div className="price-wrapper">
                <p className="price">{product.price.amount} {product.price.currency}</p>
              </div>
            </div>
            <p>{product.description}</p>
          </div>
        </a>
      </li>
    ))
  ) : (
    <li>No results found</li>
  )}
</ul>



        <style jsx>{`
          .product-link {
            text-decoration: none;
            color: black;
          }
        `}</style>
      </div>
    </>
  );
}

export async function getServerSideProps({ query }) {
  try {
    const client = await clientPromise;
    const db = client.db("interns_mongo_retail");
    const searchQuery = query.q || '';

    let products;
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

      products = await db.collection("products").aggregate(searchAgg).toArray();
    } else {
      products = await db.collection("products").find({}).toArray();
    }

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
