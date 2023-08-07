import { useEffect, useState } from "react";
import Chart from "../components/Chart";

const Dashboard = () => {
    const channelOptions = ['Online', 'In-store'];
    const [selectedChannel, setSelectedChannel] = useState('All'); // Default to 'All'
    const [filterChannel, setFilterChannel] = useState(null); // No initial filter
    const [menuOpen, setMenuOpen] = useState(false);
    const [filterName, setFilterName] = useState("Channel"); // Initial filter name


    useEffect(() => {
      if (selectedChannel === 'All') {
        setFilterChannel(null); // No filter when 'All' is selected
        setFilterName("Channel");
      } else {
        setFilterChannel({ "channel": selectedChannel });
        setFilterName(selectedChannel);
      }
    }, [selectedChannel]);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const handleChannelChange = (value) => {
        setSelectedChannel(value);
        toggleMenu();
    };
    
    const handleClearFilters = () => {
        setSelectedChannel('All');
        setFilterChannel(null);
        setFilterName('Channel');
    };

  return (
    <div className="App">
        <div className="dashboard-container">
            <div className="filters">
                <div className="filter-buttons">
                    <button className="clear-filters-button" onClick={handleClearFilters}>
                        Clear Filters
                    </button>
                    <div className="dropdown">
                        <button className="dropdown-toggle" onClick={toggleMenu}>
                            {filterName}
                            <span className={`chevron ${menuOpen ? "up" : "down"}`}>&#9660;</span>
                        </button>
                        {menuOpen && (
                            <div className="dropdown-menu">
                            {channelOptions.map(option => {
                                const value = option.toLowerCase();
                                return (
                                    <div className="radio-option" key={value}>
                                        <input
                                            type="radio"
                                            name="channel"
                                            value={value}
                                            onChange={() => handleChannelChange(value)}
                                            checked={value === selectedChannel}
                                        />
                                        
                                        <label htmlFor={value} title={option}>
                                            {option}
                                        </label>
                                        
                                    </div>
                                );
                            })}
                        </div>
                    )}
          </div>
        </div>
      </div>
      

      <div className="charts">
        <Chart
          className="chart"
          height={'500px'}
          width={'600px'}
          filter={filterChannel}
          chartId={'64c9111c-ccec-427c-86e7-a15ee70ef1eb'}
        />
            <Chart 
        className="chart"
        height={'500px'} 
        width={'600px'} 
        filter={filterChannel} 
        chartId={'64ca6af3-29c8-4893-8c16-98c441c70ccf'}
        />
        <Chart 
        className="chart"
        height={'500px'} 
        width={'600px'} 
        filter={filterChannel} 
        chartId={'64ca7284-ee91-45d4-8a86-d7325b7ff8cb'}
        />
        <Chart 
        className="chart"
        height={'500px'} 
        width={'600px'} 
        filter={filterChannel} 
        chartId={'64ca763c-13b1-4dab-804f-9e6d6a33ca87'}
        />
         </div>
      </div>
    </div>
  );
};

export default Dashboard;








    