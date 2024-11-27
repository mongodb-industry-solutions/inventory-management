import { useEffect, useState, useRef, useContext } from "react";
import { useRouter } from "next/router";
import { ObjectId } from "bson";
import ChartsEmbedSDK from "@mongodb-js/charts-embed-dom";
import { UserContext } from "../context/UserContext";
import styles from "../styles/dashboard.module.css";
import { useToast } from "@leafygreen-ui/toast";

const Dashboard = () => {
  const channelOptions = ["Online", "In-store"];
  const [selectedChannel, setSelectedChannel] = useState("All"); // Default to 'All'
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterName, setFilterName] = useState("Channel"); // Initial filter name
  const [rendered, setRendered] = useState(false);
  const [analyticsInfo, setAnalyticsInfo] = useState(null); // Store API config info

  const router = useRouter();
  const { location, edge } = router.query;

  const { pushToast } = useToast();

  const {
    startWatchDashboard,
    startWatchInventoryCheck,
  } = useContext(UserContext);

  const dashboardDiv = useRef(null);

  let locationFilter = {};

  if (location) {
    locationFilter = {
      $or: [
        { "location.destination.id": ObjectId.createFromHexString(location) },
        { "location.origin.id": ObjectId.createFromHexString(location) },
        { checkResult: { $exists: true } },
      ],
    };
  }
  const [dashboard, setDashboard] = useState(null);

  // Renamed addAlert to handleAlert to avoid conflicts
  const addAlert = (checkResult) => {
    if (checkResult) {
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

   // Fetch configuration from API route
   useEffect(() => {
    const fetchAnalyticsInfo = async () => {
        try {
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error('Failed to fetch analytics configuration');
            }
            const data = await response.json();
            setAnalyticsInfo(data.analyticsInfo);
        } catch (error) {
            console.error('Error fetching analytics info:', error);
        }
    };

    fetchAnalyticsInfo();
}, []);


  // Initialize and render dashboard
  useEffect(() => {
    if (analyticsInfo) {
        const sdk = new ChartsEmbedSDK({ baseUrl: analyticsInfo.chartsBaseUrl });
        const initializedDashboard = sdk.createDashboard({
            dashboardId: analyticsInfo.dashboardIdGeneral,
            widthMode: 'scale',
            filter: locationFilter,
            heightMode: 'scale',
            background: '#fff'
        });

        setDashboard(initializedDashboard);

        initializedDashboard.render(dashboardDiv.current)
            .then(() => setRendered(true))
            .catch(err => console.error("Error during Charts rendering.", err));

        if (dashboardDiv.current) {
            dashboardDiv.current.style.height = "900px";
        }
    }
}, [analyticsInfo]);

  useEffect(() => {
    if (selectedChannel === "All") {
      setFilterName("Channel");
    } else {
      setFilterName(selectedChannel);
    }
  }, [selectedChannel]);

  useEffect(() => {
    console.log("Starting real-time dashboard and inventory check streams.");

    // Start watching the dashboard and inventory check streams
    const stopDashboardStream = startWatchDashboard(dashboard);
    const stopInventoryCheckStream = startWatchInventoryCheck(dashboard, addAlert);

    // Cleanup function to stop the streams
    return () => {
      console.log("Stopping real-time dashboard and inventory check streams.");
      stopDashboardStream();
      stopInventoryCheckStream();
    };
  }, [dashboard, addAlert, startWatchDashboard, startWatchInventoryCheck]);

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
    dashboard
      .setFilter({ channel: value })
      .catch((err) => console.log("Error while filtering.", err));
  };

  const handleClearFilters = () => {
    setSelectedChannel("All");
    setFilterName("Channel");
    dashboard
      .setFilter({})
      .catch((err) => console.log("Error while clearing filters.", err));
  };


  return (
    <div className="App">
      <div className="dashboard-container">
        <div className="filters">
          <div className="filter-buttons">
            <div className="dropdown">
              <button className="dropdown-toggle" onClick={toggleMenu}>
                {filterName}
                <span className={`chevron ${menuOpen ? "up" : "down"}`}>
                  &#9660;
                </span>
              </button>
              {menuOpen && (
                <div className="dropdown-menu">
                  {channelOptions.map((option) => {
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
        <div className={styles["dashboard"]} ref={dashboardDiv} />
      </div>
    </div>
  );
};

export async function getServerSideProps(context) {
  try {
    return {
      props: {},
    };
  } catch (e) {
    console.error(e);
    return { props: { ok: false, reason: "Server error" } };
  }
}

export default Dashboard;
