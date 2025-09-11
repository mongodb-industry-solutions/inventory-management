"use client";

import React, { useState, useEffect, useContext } from "react";
import { useUser } from "../context/UserContext";
import { useRouter } from "next/router";
import { FaStore, FaIndustry } from "react-icons/fa";
import styles from "../styles/navbar.module.css";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const { selectedUser } = useUser();

  const router = useRouter();
  const { type, industry: industryParam } = router.query;
  const industry =
    industryParam === "manufacturing" || industryParam === "retail"
      ? industryParam
      : "retail";
  const prefix = industry ? `/${industry}` : "";

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setIsOpen(false);
  };

  /* Select default location */
  useEffect(() => {
    setSelectedOption(selectedUser?.permissions?.locations?.[0]?.name);
    setSelectedLocationId(selectedUser?.permissions?.locations?.[0]?.id);
  }, [selectedUser]);

  return (
    <div
      className={`${styles["layout-navbar"]} ${
        selectedLocationId ? styles["branch"] : styles["hq"]
      }`}
    >
      <div className={styles["dropdown"]}>
        {industry == "manufacturing" ? <FaIndustry /> : <FaStore />}
        <button
          className={styles["dropdown-toggle"]}
          onClick={handleDropdownToggle}
        >
          {selectedOption || "Barcelona Area"}
          <span className={styles["dropdown-arrow"]}></span>
        </button>
        {isOpen && (
          <div className={styles["dropdown-menu"]}>
            {selectedUser?.permissions?.locations.map((location) => (
              <a
                key={location.id}
                href="#"
                onClick={() => handleOptionClick(location.name)}
              >
                {location.name}
              </a>
            ))}
          </div>
        )}

        <div className={styles["mongodb-button-container"]}>
          <a
            href={
              selectedLocationId
                ? `${prefix}/products?location=${selectedLocationId}`
                : `${prefix}/products`
            }
          >
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === "/products" ? styles["bold-text"] : ""
              }`}
            >
              Real-time Inventory
            </button>
          </a>
          <a
            href={
              selectedLocationId
                ? `${prefix}/transactions?type=inbound&location=${selectedLocationId}`
                : `${prefix}/transactions?type=inbound`
            }
          >
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === "/transactions" && type === "inbound"
                  ? styles["bold-text"]
                  : ""
              }`}
            >
              Orders
            </button>
          </a>
          <a
            href={
              selectedLocationId
                ? `${prefix}/transactions?type=outbound&location=${selectedLocationId}`
                : `${prefix}/transactions?type=outbound`
            }
          >
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === "/transactions" && type === "outbound"
                  ? styles["bold-text"]
                  : ""
              }`}
            >
              {industry == "manufacturing" ? (
                <>Dispatch Events</>
              ) : (
                <>Sales Events</>
              )}
            </button>
          </a>
          <a
            href={
              selectedLocationId
                ? `${prefix}/dashboard?location=${selectedLocationId}`
                : `${prefix}/dashboard`
            }
          >
            <button
              className={`${styles["mongodb-button"]} ${
                router.pathname === "/dashboard" ? styles["bold-text"] : ""
              }`}
            >
              Analytics
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
