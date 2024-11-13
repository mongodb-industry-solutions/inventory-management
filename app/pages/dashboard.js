import { useEffect, useState, useRef, useContext } from "react";
import { useRouter } from 'next/router';
import { ObjectId } from "bson"
import ChartsEmbedSDK from '@mongodb-js/charts-embed-dom';
import { UserContext } from '../context/UserContext';
import { ServerContext } from './_app';
import styles from '../styles/dashboard.module.css';
import { useToast } from '@leafygreen-ui/toast';

const Dashboard = () => {
    const channelOptions = ['Online', 'In-store'];
    const [selectedChannel, setSelectedChannel] = useState('All'); // Default to 'All'
    const [menuOpen, setMenuOpen] = useState(false);
    const [filterName, setFilterName] = useState("Channel"); // Initial filter name
    const [rendered, setRendered] = useState(false);

    const router = useRouter();
    const { location, edge } = router.query;

    const { pushToast } = useToast();

    const utils = useContext(ServerContext);
    const {startWatchDashboard, stopWatchDashboard, startWatchInventoryCheck, stopWatchInventoryCheck} = useContext(UserContext);

    const sdk = new ChartsEmbedSDK({ baseUrl: utils.analyticsInfo.chartsBaseUrl });
    const dashboardDiv = useRef(null);

    let locationFilter = {};

    if (location) {
        locationFilter= { $or: [
          {'location.destination.id': new ObjectId(location)}
          ,{'location.origin.id': new ObjectId(location)},
          {'checkResult': {$exists: true}}
        ]};
    };
    const [dashboard] = useState(sdk.createDashboard({ 
        dashboardId: utils.analyticsInfo.dashboardIdGeneral,
        widthMode: 'scale', 
        filter: locationFilter,
        heightMode: 'scale', 
        background: '#fff'
    }));

    useEffect(() => {
      dashboard.render(dashboardDiv.current)
        .then(() => setRendered(true))
        .catch(err => console.log("Error during Charts rendering.", err));

      if (dashboardDiv.current) {
        dashboardDiv.current.style.height = "900px"; 
    }
    }, [dashboard]);

    useEffect(() => {
      if (selectedChannel === 'All') {
        setFilterName("Channel");
      } else {
        setFilterName(selectedChannel);
      }
    }, [selectedChannel]);

  useEffect(() => {
    if (rendered) {
        dashboard.setFilter(locationFilter);
        dashboard.refresh();
    }
  }, [router.asPath]);

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

    const addAlert = (checkResult) => {
      
      if(checkResult) {
        pushToast({
          title: "Hooray! Perfect inventory match!", 
          variant: "success"
        });
      } else {
        pushToast({
          title: "Oops! Inventory Discrepancy Detected.", 
          variant: "warning"
        });
      }
      
    };

  return (
    <div className="App">
        <div className="dashboard-container">
            <div className="filters">
                <div className="filter-buttons">
                    
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
        <button className="clear-filters-button" onClick={handleClearFilters}>
                        Clear Filters
                    </button>
      </div>
      <div className={styles["dashboard"]} ref={dashboardDiv}/>
      </div>
    </div>
  );
};

export async function getServerSideProps(context) {
  try {


    return {
        props: { },
    };
  } catch (e) {
    console.error(e);
    return { props: {ok: false, reason: "Server error"}};
  }
}

export default Dashboard;








    