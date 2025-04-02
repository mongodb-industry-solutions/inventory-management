import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import ChartsEmbedSDK from "@mongodb-js/charts-embed-dom";
import styles from "../styles/dashboard.module.css";

const Dashboard = () => {
  const router = useRouter();
  const { location } = router.query;

  const dashboardDiv = useRef(null);
  const dashboard = useRef(null);
  const streamsActive = useRef(false);

  const [analyticsInfo, setAnalyticsInfo] = useState(null);
  const [rendered, setRendered] = useState(false); // New state to track rendering
  const [selectedChannel, setSelectedChannel] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterName, setFilterName] = useState("Channel");

  const channelOptions = ["Online", "In-store"];
  const sessionId = useRef(
    `dashboard_${Math.random().toString(36).substr(2, 9)}`
  );

  const locationFilter = location
    ? {
        $or: [
          {
            "location.destination.id": { $oid: location },
          },
          {
            "location.origin.id": { $oid: location },
          },
          { checkResult: { $exists: true } },
        ],
      }
    : {};

  // Fetch analytics configuration from the backend
  useEffect(() => {
    const fetchAnalyticsInfo = async () => {
      try {
        const response = await fetch("/api/config");
        if (!response.ok)
          throw new Error("Failed to fetch analytics configuration");

        const data = await response.json();
        setAnalyticsInfo(data.analyticsInfo);
      } catch (error) {
        console.error("Error fetching analytics info:", error);
      }
    };

    fetchAnalyticsInfo();
  }, []);

  // Initialize the dashboard using ChartsEmbedSDK
  useEffect(() => {
    if (analyticsInfo && !dashboard.current) {
      //const ChartsEmbedSDK = require("@mongodb-js/charts-embed-dom").default;
      const sdk = new ChartsEmbedSDK({
        baseUrl: analyticsInfo.chartsBaseUrl,
      });

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
          setRendered(true); // Mark the dashboard as rendered
        })
        .catch((err) => console.error("Error during Charts rendering.", err));

      if (dashboardDiv.current) {
        dashboardDiv.current.style.height = "900px";
      }
    }
  }, [analyticsInfo, locationFilter]);

  // SSE updates handler
  const listenToSSEUpdates = useCallback(() => {
    console.log("Listening to SSE updates for the dashboard");
    const dashboardPath = `/api/sse?sessionId=${sessionId.current}&colName=transactions`;
    const inventoryPath = `/api/sse?sessionId=${sessionId.current}_inventory&colName=inventoryCheck`;

    const dashboardEventSource = new EventSource(dashboardPath);
    const inventoryEventSource = new EventSource(inventoryPath);

    dashboardEventSource.onopen = () =>
      console.log("Dashboard SSE connection opened.");
    inventoryEventSource.onopen = () =>
      console.log("InventoryCheck SSE connection opened.");

    dashboardEventSource.onmessage = (event) => {
      dashboard.current?.refresh().catch(console.error);
    };

    inventoryEventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.checkResult) {
        toast.success("Hooray! Perfect inventory match!");
      } else {
        toast.error("Oops! Inventory Discrepancy Detected.");
      }

      dashboard.current?.refresh().catch(console.error);
    };

    dashboardEventSource.onerror = (error) => {
      console.error("Dashboard SSE error:", error);
      dashboardEventSource.close();
    };

    inventoryEventSource.onerror = (error) => {
      console.error("InventoryCheck SSE error:", error);
      inventoryEventSource.close();
    };

    return () => {
      console.log("Closing SSE connections.");
      dashboardEventSource.close();
      inventoryEventSource.close();
    };
  }, []);

  // Start SSE updates after dashboard is rendered
  useEffect(() => {
    console.log("Checking streamsActive and rendered:", {
      streamsActive: streamsActive.current,
      rendered,
    });

    if (rendered && !streamsActive.current) {
      console.log("Initializing SSE updates...");
      const stopListening = listenToSSEUpdates();
      streamsActive.current = true;

      return () => {
        console.log("Cleaning up SSE updates...");
        stopListening();
        streamsActive.current = false;
      };
    }
  }, [rendered, listenToSSEUpdates]);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleChannelChange = (value) => {
    setSelectedChannel(value);
    toggleMenu();
    if (dashboard.current) {
      dashboard.current
        .setFilter({ channel: value })
        .then(() =>
          console.log(`Dashboard filter applied for channel: ${value}`)
        )
        .catch((err) => console.error("Error while filtering.", err));
    }
  };

  const handleClearFilters = () => {
    setSelectedChannel("All");
    setFilterName("Channel");
    if (dashboard.current) {
      dashboard.current
        .setFilter({})
        .then(() => console.log("Dashboard filters cleared"))
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
        <div className={styles.dashboard} ref={dashboardDiv} />
      </div>
    </div>
  );
};

export default Dashboard;
