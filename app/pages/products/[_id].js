import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/router";
import { clientPromise } from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import ChartsEmbedSDK from "@mongodb-js/charts-embed-dom";
import { FaTshirt, FaWhmcs } from "react-icons/fa";
import styles from "../../styles/product.module.css";
import Popup from "../../components/ReplenishmentPopup";
import StockLevelBar from "../../components/StockLevelBar";
import Toggle from "@leafygreen-ui/toggle";
import Icon from "@leafygreen-ui/icon";
import IconButton from "@leafygreen-ui/icon-button";

export default function Product({ preloadedProduct }) {
  const [product, setProduct] = useState(preloadedProduct); // Initialize with server-side data
  const [analyticsInfo, setAnalyticsInfo] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [rendered, setRendered] = useState(false);
  const [isAutoOn, setIsAutoOn] = useState(preloadedProduct.autoreplenishment);
  const [isAutoDisabled, setIsAutoDisabled] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [editableField, setEditableField] = useState(null);
  const [editedValue, setEditedValue] = useState("");
  const [imageError, setImageError] = useState(false);
  const industry = process.env.NEXT_PUBLIC_DEMO_INDUSTRY || "retail";

  const dashboardDiv = useRef(null);
  const router = useRouter();
  const eventSourceRef = useRef(null); // To track the active SSE connection
  const sessionId = useRef(
    `session_${Math.random().toString(36).substr(2, 9)}`
  );
  const { location } = router.query;

  // Define light colors for dynamic leaf URL logic
  const lightColors = [
    "#B1FF05",
    "#E9FF99",
    "#B45AF2",
    "#F2C5EE",
    "#00D2FF",
    "#A6FFEC",
    "#FFE212",
    "#FFEEA9",
    "#ffffff",
    "#FFFFFF",
  ];

  const leafUrl = lightColors.includes(product?.color?.hex)
    ? "/images/leaf_dark.png"
    : "/images/leaf_white.png";

  const productFilter = useMemo(
    () => ({
      "items.product.id": { $oid: preloadedProduct._id },
    }),
    [preloadedProduct]
  );

  const locationFilter = useMemo(
    () => (location ? { "location.destination.id": { $oid: location } } : {}),
    [location]
  );

  // Fetch analytics configuration and initialize the dashboard
  useEffect(() => {
    const fetchAnalyticsInfo = async () => {
      try {
        const response = await fetch("/api/config");
        if (!response.ok)
          throw new Error("Failed to fetch analytics configuration");

        const data = await response.json();
        setAnalyticsInfo(data.analyticsInfo);

        const sdk = new ChartsEmbedSDK({
          baseUrl: data.analyticsInfo.chartsBaseUrl,
        });

        const initializedDashboard = sdk.createDashboard({
          dashboardId: data.analyticsInfo.dashboardIdProduct,
          filter: { $and: [productFilter, locationFilter] },
          widthMode: "scale",
          heightMode: "scale",
          background: "#fff",
        });

        setDashboard(initializedDashboard);
      } catch (error) {
        console.error("Error fetching analytics info:", error);
      }
    };

    fetchAnalyticsInfo();
  }, [preloadedProduct, location, productFilter, locationFilter]);

  // Render the dashboard
  useEffect(() => {
    if (dashboard && dashboardDiv.current) {
      dashboard
        .render(dashboardDiv.current)
        .then(() => console.log("Dashboard rendered successfully"))
        .catch((err) => console.error("Error rendering dashboard:", err));
    }
  }, [dashboard]);

  useEffect(() => {
    // Update autoreplenishment state if it changes
    if (product && product.autoreplenishment !== isAutoOn) {
      setIsAutoOn(product.autoreplenishment);
    }

    // Update dashboard if product change is detected
    if (rendered) {
      dashboard.setFilter({ $and: [productFilter, locationFilter] });
      dashboard.refresh();
    }
  }, [product, productFilter, locationFilter]);

  // Handle SSE updates for real-time updates
  const listenToSSEUpdates = useCallback(() => {
    const path = `/api/sse?sessionId=${sessionId.current}&colName=products&_id=${preloadedProduct._id}`;

    console.log("Setting up SSE connection for product:", path);

    // Clean up existing SSE connection
    if (eventSourceRef.current) {
      console.log("Cleaning up previous SSE connection...");
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(path);

    eventSource.onmessage = (event) => {
      const updatedProduct = JSON.parse(event.data);
      console.log("SSE update received");
      if (updatedProduct.fullDocument) {
        setProduct(updatedProduct.fullDocument);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      eventSource.close();
      setTimeout(() => listenToSSEUpdates(), 5000); // Retry after 5 seconds
    };

    eventSourceRef.current = eventSource;

    return eventSource;
  }, []);

  useEffect(() => {
    setProduct(preloadedProduct);
    if (rendered) {
      dashboard.setFilter({ $and: [productFilter, locationFilter] });
      dashboard.refresh();
    }
  }, [router.asPath, productFilter, locationFilter]);

  // SSE Effect with Cleanup
  useEffect(() => {
    const eventSource = listenToSSEUpdates();

    return () => {
      if (eventSource) {
        eventSource.close();
        console.log("SSE connection closed.");
      }
    };
  }, [listenToSSEUpdates]);

  const handleOpenPopup = () => {
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    dashboard.refresh();
  };

  const handleToggleAutoreplenishment = async () => {
    if (!product?._id) return;

    try {
      setIsAutoDisabled(true);
      console.log("Current product state before API call:", product);

      const response = await fetch("/api/setAutoreplenishment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: { _id: product._id },
          update: { $set: { autoreplenishment: !isAutoOn } },
          collection: "products",
        }),
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        console.log("Updated product received from API:", updatedProduct);

        // Check if updated product has 'items' and 'stock'
        if (!updatedProduct.items || !Array.isArray(updatedProduct.items)) {
          console.error(
            "Updated product is missing 'items' array:",
            updatedProduct
          );
        }

        setProduct(updatedProduct); // Update state with the full product document
        setIsAutoOn(updatedProduct.autoreplenishment);
      } else {
        console.error("Error toggling autoreplenishment");
      }
    } finally {
      setIsAutoDisabled(false);
    }
  };

  const handleEdit = (field) => {
    if (!location) {
      setEditableField(field);

      field === "price"
        ? setEditedValue(product[field]?.amount || "")
        : setEditedValue(product[field] || "");
    }
  };

  const handleSaveEdit = async () => {
    try {
      const field = editableField === "price" ? "price.amount" : editableField;
      const value =
        editableField === "price" ? parseInt(editedValue, 10) : editedValue;

      const response = await fetch("/api/updateProductStock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: { _id: preloadedProduct._id },
          update: { $set: { [field]: value } },
        }),
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setProduct(updatedProduct);
        setEditableField(null);
      } else {
        console.log("Error updating product");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelEdit = () => {
    setEditableField(null);
    setEditedValue("");
  };

  const handleInputChange = (event) => {
    setEditedValue(event.target.value);
  };

  return (
    <>
      <div className="content">
        <div className={styles["product-detail-content"]}>
          {/* Product Image Section */}
          <div className={styles["image-container"]}>
            {imageError || !product?.image?.url ? (
              industry === "manufacturing" ? (
                <FaWhmcs color="grey" className={styles["default-icon"]} />
              ) : (
                <>
                  <FaTshirt
                    color={product?.color?.hex || "grey"}
                    className={styles["default-icon"]}
                  />
                  <img src={leafUrl} alt="Leaf" className={styles["leaf"]} />
                </>
              )
            ) : (
              <img
                src={product?.image?.url}
                alt={product?.image?.alt || "Product Image"}
                className={styles["product-image"]}
                onError={() => setImageError(true)}
              />
            )}
          </div>

          {/* Product Details Section */}
          <div className={styles["details"]}>
            <p className="name">
              {editableField === "name" ? (
                <>
                  <input
                    type="text"
                    value={editedValue}
                    onChange={handleInputChange}
                  />
                  <IconButton onClick={handleSaveEdit} aria-label="Save">
                    <Icon glyph="Save" />
                  </IconButton>
                  <IconButton onClick={handleCancelEdit} aria-label="Cancel">
                    <Icon glyph="XWithCircle" />
                  </IconButton>
                </>
              ) : (
                <>
                  {product?.name || "N/A"} &nbsp;
                  {!location && (
                    <IconButton
                      disabled={editableField !== null}
                      onClick={() => handleEdit("name")}
                      aria-label="Edit"
                    >
                      <Icon glyph="Edit" />
                    </IconButton>
                  )}
                </>
              )}
            </p>
            <p className="price">
              {editableField === "price" ? (
                <>
                  <input
                    type="text"
                    value={editedValue}
                    onChange={handleInputChange}
                  />
                  <IconButton onClick={handleSaveEdit} aria-label="Save">
                    <Icon glyph="Save" />
                  </IconButton>
                  <IconButton onClick={handleCancelEdit} aria-label="Cancel">
                    <Icon glyph="XWithCircle" />
                  </IconButton>
                </>
              ) : (
                <>
                  {product?.price?.amount || "0"}{" "}
                  {product?.price?.currency || ""}
                  &nbsp;
                  {!location && (
                    <IconButton
                      disabled={editableField !== null}
                      onClick={() => handleEdit("price")}
                      aria-label="Edit"
                    >
                      <Icon glyph="Edit" />
                    </IconButton>
                  )}
                </>
              )}
            </p>
            <p className="code">{product?.code || "N/A"}</p>

            {/* Stock Level Bar */}
            {product?.total_stock_sum && (
              <StockLevelBar
                stock={product?.total_stock_sum}
                locationId={location}
              />
            )}

            {/* Autoreplenishment Toggle */}
            {location && (
              <div className={styles["switch-container"]}>
                <span className={styles["switch-text"]}>Autoreplenishment</span>
                <Toggle
                  aria-label="Autoreplenishment"
                  className={styles["switch"]}
                  checked={isAutoOn}
                  disabled={isAutoDisabled}
                  onChange={handleToggleAutoreplenishment}
                />
              </div>
            )}
          </div>

          {/* Product Items Table */}
          <div className={styles["table"]}>
            <table>
              <thead>
                <tr>
                  <td>{industry === "manufacturing" ? "Item" : "Size"}</td>
                  <td>{industry === "manufacturing" ? "Factory" : "Store"}</td>
                  <td>Ordered</td>
                  <td>Warehouse</td>
                  <td>Delivery Time</td>
                  <td>Stock Level</td>
                </tr>
              </thead>
              <tbody>
                {product?.items
                  ?.sort((a, b) => {
                    const sizeOrder = {
                      XS: 0,
                      S: 1,
                      M: 2,
                      L: 3,
                      XL: 4,
                    };
                    const sizeIndexA = sizeOrder[a?.name] ?? Infinity;
                    const sizeIndexB = sizeOrder[b?.name] ?? Infinity;
                    return sizeIndexA - sizeIndexB;
                  })
                  .map((item, index) => (
                    <tr key={index}>
                      <td>{item?.name || "N/A"}</td>
                      <td>
                        {location
                          ? item?.stock?.find(
                              (stock) => stock?.location?.id === location
                            )?.amount ?? 0
                          : item?.stock?.find(
                              (stock) => stock?.location?.type !== "warehouse"
                            )?.amount ?? 0}
                      </td>
                      <td>
                        {location
                          ? item?.stock?.find(
                              (stock) => stock?.location?.id === location
                            )?.ordered ?? 0
                          : item?.stock?.find(
                              (stock) => stock?.location?.type !== "warehouse"
                            )?.ordered ?? 0}
                      </td>
                      <td>
                        {item?.stock?.find(
                          (stock) => stock?.location?.type === "warehouse"
                        )?.amount ?? 0}
                      </td>
                      <td>
                        {item?.delivery_time?.amount || 0}{" "}
                        {item?.delivery_time?.unit || "N/A"}
                      </td>
                      <td>
                        {item?.stock && (
                          <StockLevelBar
                            stock={item?.stock}
                            locationId={location}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className={styles["legend"]}>
              <span className={`${styles["circle"]} ${styles["full"]}`}></span>{" "}
              <span>Full</span> &nbsp;&nbsp;
              <span
                className={`${styles["circle"]} ${styles["low"]}`}
              ></span>{" "}
              <span>Low</span> &nbsp;&nbsp;
              <span
                className={`${styles["circle"]} ${styles["ordered"]}`}
              ></span>{" "}
              <span>Ordered</span>
            </div>

            {/* Replenish Stock Button */}
            {location && (
              <button onClick={handleOpenPopup}>REPLENISH STOCK</button>
            )}
          </div>
        </div>

        {/* Dashboard */}
        <div className={styles["dashboard"]} ref={dashboardDiv} />

        {/* Popup */}
        {showPopup && <Popup product={product} onClose={handleClosePopup} />}
      </div>
    </>
  );
}

export async function getServerSideProps(context) {
  try {
    if (!process.env.MONGODB_DATABASE_NAME) {
      throw new Error(
        'Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"'
      );
    }

    const dbName = process.env.MONGODB_DATABASE_NAME;

    const { params, query } = context;
    const locationId = query.location;

    const client = await clientPromise;
    const db = client.db(dbName);

    const collectionName = locationId ? "products" : "products_area_view";

    const product = await db
      .collection(collectionName)
      .findOne({ _id: ObjectId.createFromHexString(params._id) });

    return {
      props: {
        preloadedProduct: JSON.parse(JSON.stringify(product)),
      },
    };
  } catch (e) {
    console.error(e);
    return { props: { ok: false, reason: "Server error" } };
  }
}
