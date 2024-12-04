import { useEffect, useState, useRef, useContext, useCallback } from "react";
import { useRouter } from "next/router";
import { ObjectId } from "bson";
import ChartsEmbedSDK from "@mongodb-js/charts-embed-dom";
import { UserContext } from "../context/UserContext";
import styles from "../styles/dashboard.module.css";
import { useToast } from "@leafygreen-ui/toast";

const Dashboard = () => {
  const channelOptions = ["Online", "In-store"];
  const [selectedChannel, setSelectedChannel] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterName, setFilterName] = useState("Channel");
  const [analyticsInfo, setAnalyticsInfo] = useState(null);
  const [dashboardRendered, setDashboardRendered] = useState(false); // Track dashboard rendering status

  const router = useRouter();
  const { location } = router.query;

  const { pushToast } = useToast();
  const { startWatchDashboard, startWatchInventoryCheck } = useContext(UserContext);

  const dashboardDiv = useRef(null);
  const dashboard = useRef(null);
  const streamsActive = useRef(false);

  // Define locationFilter for use in rendering the dashboard
  const locationFilter = location
    ? {
        $or: [
          { "location.destination.id": ObjectId.createFromHexString(location) },
          { "location.origin.id": ObjectId.createFromHexString(location) },
          { checkResult: { $exists: true } },
        ],
      }
    : {};

  // Function to handle alerts for inventory checks
  const handleAlert = useCallback(
    (checkResult) => {
      if (checkResult) {
        pushToast({
          title: "Hooray! Perfect inventory match!",
          variant: "success",
        });
      } else {
        pushToast({
          title: "Oops! Inventory Discrepancy Detected.",
          variant: "warning",
        });
      }
    },
    [pushToast]
  );

  // Fetch analytics configuration from the backend
  useEffect(() => {
    const fetchAnalyticsInfo = async () => {
      try {
        console.log("Fetching analytics configuration...");
        const response = await fetch("/api/config");
        if (!response.ok) {
          throw new Error("Failed to fetch analytics configuration");
        }
        const data = await response.json();
        setAnalyticsInfo(data.analyticsInfo);
        console.log("Analytics configuration fetched successfully:", data.analyticsInfo);
      } catch (error) {
        console.error("Error fetching analytics info:", error);
      }
    };

    fetchAnalyticsInfo();
  }, []);

  // Initialize the dashboard with ChartsEmbedSDK
  useEffect(() => {
    if (analyticsInfo && !dashboard.current) {
      console.log("Initializing the dashboard with analytics info:", analyticsInfo);
      const sdk = new ChartsEmbedSDK({ baseUrl: analyticsInfo.chartsBaseUrl });
      dashboard.current = sdk.createDashboard({
        dashboardId: analyticsInfo.dashboardIdGeneral,
        widthMode: "scale",
        filter: locationFilter,
        heightMode: "scale",
        background: "#fff",
      });

      dashboard.current
        .render(dashboardDiv.current)
        .then(() => {
          console.log("Dashboard successfully rendered");
          setDashboardRendered(true); // Mark dashboard as rendered
        })
        .catch((err) => console.error("Error during Charts rendering.", err));

      if (dashboardDiv.current) {
        dashboardDiv.current.style.height = "900px";
      }
    }
  }, [analyticsInfo, locationFilter]);

  // Manage real-time streams once the dashboard is rendered
  useEffect(() => {
    if (dashboardRendered && dashboard.current && !streamsActive.current) {
      console.log("Starting real-time streams for dashboard and inventory check...");

      const stopDashboardStream = startWatchDashboard(dashboard.current);
      const stopInventoryCheckStream = startWatchInventoryCheck(dashboard.current, handleAlert);

      streamsActive.current = true;

      return () => {
        console.log("Stopping real-time streams for dashboard and inventory check.");
        if (stopDashboardStream) stopDashboardStream();
        if (stopInventoryCheckStream) stopInventoryCheckStream();
        streamsActive.current = false;
      };
    }
  }, [dashboardRendered, startWatchDashboard, startWatchInventoryCheck, handleAlert]);

  // Update the filter name when the channel changes
  useEffect(() => {
    setFilterName(selectedChannel === "All" ? "Channel" : selectedChannel);
  }, [selectedChannel]);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleChannelChange = (value) => {
    setSelectedChannel(value);
    toggleMenu();
    if (dashboard.current) {
      dashboard.current
        .setFilter({ channel: value })
        .then(() => {
          console.log("Dashboard filter applied for channel:", value);
        })
        .catch((err) => console.error("Error while filtering.", err));
    }
  };

  const handleClearFilters = () => {
    setSelectedChannel("All");
    setFilterName("Channel");
    if (dashboard.current) {
      dashboard.current
        .setFilter({})
        .then(() => {
          console.log("Dashboard filters cleared");
        })
        .catch((err) => console.error("Error while clearing filters.", err));
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

export default Dashboard;
