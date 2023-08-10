import { useEffect, useState, useRef } from "react";
import  *  as  Realm  from  "realm-web";
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';
import styles from '../styles/dashboard.module.css';

const  app = new  Realm.App({ id:  "interns-mongo-retail-app-nghfn"});

const Dashboard = () => {
    const channelOptions = ['Online', 'In-store'];
    const [selectedChannel, setSelectedChannel] = useState('All'); // Default to 'All'
    const [menuOpen, setMenuOpen] = useState(false);
    const [filterName, setFilterName] = useState("Channel"); // Initial filter name

    const sdk = new ChartsEmbedSDK({ baseUrl: 'https://charts.mongodb.com/charts-jeffn-zsdtj' });
    const dashboardDiv = useRef(null);
    const [rendered, setRendered] = useState(false);
    const [dashboard] = useState(sdk.createDashboard({ 
        dashboardId: '64c90e0d-a307-4906-8621-2b3f5811ad4c',
        widthMode: 'scale', 
        heightMode: 'scale', 
        background: '#fff'
    }));

    useEffect(() => {
      dashboard.render(dashboardDiv.current).then(() => setRendered(true)).catch(err => console.log("Error during Charts rendering.", err));
    }, [dashboard]);

    useEffect(() => {
      if (selectedChannel === 'All') {
        setFilterName("Channel");
      } else {
        setFilterName(selectedChannel);
      }
    }, [selectedChannel]);

    useEffect(() => {
      const  login = async () => {
      
          await app.logIn(Realm.Credentials.anonymous());
          const mongodb = app.currentUser.mongoClient("mongodb-atlas");
          const collection = mongodb.db("interns_mongo_retail").collection("sales");
          
          for await (const  change  of  collection.watch({})) {
            dashboard.refresh();
          }
      }
      login();
  }, []);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const handleChannelChange = (value) => {
        setSelectedChannel(value);
        toggleMenu();
        dashboard.setFilter({ "channel": value }).catch(err => console.log("Error while filtering.", err));
    };
    
    const handleClearFilters = () => {
        setSelectedChannel('All');
        setFilterName('Channel');
        dashboard.setFilter({}).catch(err => console.log("Error while clearing filters.", err));
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
      <div className={styles["dashboard"]} ref={dashboardDiv}/>
      </div>
    </div>
  );
};

export default Dashboard;








    