"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "../context/UserContext";
import { MongoDBLogoMark } from "@leafygreen-ui/logo";
import Icon from "@leafygreen-ui/icon";
import IconButton from "@leafygreen-ui/icon-button";
import { H2 } from "@leafygreen-ui/typography";
import styles from "../styles/header.module.css";
import InfoWizard from "./InfoWizard";
import { TALK_TRACK_MANUFACTURING, TALK_TRACK_RETAIL } from "../lib/const";

function Header() {
  const [usersList, setUsersList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [openHelpModal, setOpenHelpModal] = useState(false);
  const industry = process.env.NEXT_PUBLIC_DEMO_INDUSTRY || "retail";

  const router = useRouter();
  const { location, ...otherQueryParams } = router.query;

  const { selectedUser, setSelectedUser } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/getUsers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();
        if (data.documents) {
          setUsersList(data.documents);
          if (!localStorage.getItem("selectedUser")) {
            setSelectedUser(data.documents[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const defaultLocation = selectedUser.permissions.locations?.[0]?.id;
      router.push({
        pathname: router.pathname === "/" ? "/products" : router.pathname,
        query: {
          ...otherQueryParams,
          location: defaultLocation,
        },
      });
    }
  }, [selectedUser]);

  const handleDropdownToggle = () => {
    setShowDropdown(!showDropdown);
  };

  const handleUserSelection = (user) => {
    setSelectedUser(user);
    setShowDropdown(false);
  };

  return (
    <div className={styles["layout-header"]}>
      <H2>
        <MongoDBLogoMark height={32} /> LeafyInventory
      </H2>
      <InfoWizard
        open={openHelpModal}
        setOpen={setOpenHelpModal}
        tooltipText="Tell me more!"
        iconGlyph="Wizard"
        sections={
          industry === "retail" ? TALK_TRACK_RETAIL : TALK_TRACK_MANUFACTURING
        }
      />
      <div className={styles["user-info"]} onClick={handleDropdownToggle}>
        {selectedUser && (
          <img
            src={`/images/${selectedUser?._id}.png`}
            alt="User Avatar"
            className={styles["user-avatar"]}
          />
        )}
        <div>
          <div className={styles["user-name"]}>
            {selectedUser?.name} {selectedUser?.surname}
          </div>
          <div className={styles["user-job-title"]}>{selectedUser?.title}</div>
        </div>
        {showDropdown && (
          <div className={styles["dropdown-container"]}>
            <ul className={styles["user-list"]}>
              {usersList
                .filter((user) => user._id !== selectedUser?._id)
                .map((user) => (
                  <li key={user._id} onClick={() => handleUserSelection(user)}>
                    <img
                      src={`/images/${user._id}.png`}
                      alt="User Avatar"
                      className={styles["user-avatar"]}
                    />
                    <div>
                      <div className={styles["user-name"]}>
                        {user.name} {user.surname}
                      </div>
                      <div className={styles["user-job-title"]}>
                        {user.title}
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
            <IconButton
              aria-label="Control Panel"
              href={`/control?${new URLSearchParams(router.query).toString()}`}
              target="_blank"
            >
              <Icon glyph="Settings" />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
}

export default Header;
