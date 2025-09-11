"use client";

import { useRouter } from "next/router";
import { MongoDBLogo } from "@leafygreen-ui/logo";
import Icon from "@leafygreen-ui/icon";
import { H2, Subtitle, Description } from "@leafygreen-ui/typography";
import Button from "@leafygreen-ui/button";
import Card from "@leafygreen-ui/card";
import Banner from "@leafygreen-ui/banner";
import styles from "../styles/selector.module.css";

export default function IndustrySelector() {
  const router = useRouter();

  const go = (industry) => {
    router.push(`/${industry}/products`);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <div className={styles.content}>
          <MongoDBLogo />
          <H2 className={styles.centerText}>Welcome to LeafyInventory</H2>
          <br />
          <Description className={styles.description}>
            Please select the demo version you would like to explore:
          </Description>

          <div className={styles.cardsContainer}>
            <Card>
              <div style={{ padding: 16, width: 240 }}>
                <H2 className={styles.centerText}>
                  <Icon glyph="Store" /> Retail
                </H2>
                <Description className={styles.centerText}>
                  T-shirt storefront inventory
                </Description>
                <div className={styles.actions}>
                  <Button className={styles.cardButton} onClick={() => go("retail")}>
                    Try Demo
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: 16, width: 240 }}>
                <H2 className={styles.centerText}>
                  <Icon glyph="Industry" /> Manufacturing
                </H2>
                <Description className={styles.centerText}>
                  Factory and finished goods flows
                </Description>
                <div className={styles.actions}>
                  <Button
                    className={styles.cardButton}
                    onClick={() => go("manufacturing")}
                  >
                    Try Demo
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <Banner>
              Look out for <Icon glyph="Wizard" fill="#889397" /> to find out more about
              what is going on behind the scenes!
            </Banner>
          </div>
        </div>
      </div>
    </div>
  );
}


