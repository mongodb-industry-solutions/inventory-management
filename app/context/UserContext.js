import React, { createContext, useContext, useState } from 'react';
import { App, Credentials } from "realm-web";
import { ObjectId } from "bson";

export const UserContext = createContext();

let app = null;

// Specific dummy user configuration
const DUMMY_USER = {
  name: "Eddie",
  surname: "Grant",
  title: "Inventory Manager",
  permissions: {
    locations: [
      {
        id: new ObjectId("65c63cb61526ffd3415fadbd"),
        role: "inventory manager",
        name: "Bogatell Factory",
        area_code: "ES"
      }
    ]
  }
};

export const UserProvider = ({ children, value }) => {
  const [currentUser, setCurrentUser] = useState(DUMMY_USER);

  if (!app) {
    app = new App(value.appServiceInfo.appId);
  }

  const credentials = Credentials.anonymous();
  let closeStreamProductList;
  let closeStreamProductDetail;
  let closeStreamDashboard;
  let closeStreamInventoryCheck;
  let closeStreamControl;

  const getUser = async () => {
    if(app.currentUser){
      return app.currentUser;
    } else {
      return app.logIn(credentials);
    }
  };

  const getMongoCollection = async (dbName, collection) => {
    const user = await getUser();
    const client = user.mongoClient("mongodb-atlas");
    return client.db(dbName).collection(collection);
  };

  const startWatchProductList = async (setDisplayProducts, addAlert, location, utils ) => {
    console.log("Start watching stream");
    const runs = await getMongoCollection(utils.dbInfo.dbName, "products");
    const filter = {filter: {operationType: "update"}};
    const stream = runs.watch(filter);

    closeStreamProductList = () => {
      console.log("Closing stream");
      stream.return();
    };

    let updatedProduct = null;

    for await (const change of stream) {
      console.log("Change detected");
      
      if (location) { 
        updatedProduct = JSON.parse(JSON.stringify(change.fullDocument));
      } else {
        try {
          const response = await fetch(utils.apiInfo.dataUri + '/action/findOne', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Bearer ' + utils.apiInfo.accessToken,
            },
            body: JSON.stringify({
              dataSource: 'mongodb-atlas',
              database: utils.dbInfo.dbName,
              collection: "products_area_view",
              filter: { _id: { $oid: change.fullDocument._id}}
            }),
          });
          const data = await response.json();
          updatedProduct = JSON.parse(JSON.stringify(data.document));
        } catch (error) {
          console.error(error);
        }
      }

      setDisplayProducts((prevProducts) =>
        prevProducts.map((product) =>
          product._id === updatedProduct._id ? updatedProduct : product
        )
      );

      const pattern = /^items\.(\d+)\.stock/;
      for(const key of Object.keys(change.updateDescription.updatedFields)){
        if (pattern.test(key)) {
          let sku = change.fullDocument.items[parseInt(key.match(pattern)[1], 10)].sku;
          let item = updatedProduct.items.find(item => item.sku === sku);

          let itemStock = location ? 
            item.stock.find(stock => stock.location.id === location)
            : item.stock.find(stock => stock.location.type !== "warehouse");
          
          if(itemStock?.amount + itemStock?.ordered < itemStock?.threshold) {
            item.product_id = updatedProduct._id;
            addAlert(item);
          }
        }
      }
    }
  };

  const startWatchProductDetail = async (setProduct, product, location, utils ) => {
    console.log("Start watching stream");
    const runs = await getMongoCollection(utils.dbInfo.dbName, "products");
    const filter = {
      filter: {
        operationType: "update",
        "fullDocument._id": new ObjectId(product._id)
      }
    };

    const stream = runs.watch(filter);

    closeStreamProductDetail = () => {
      console.log("Closing stream");
      stream.return();
    };

    let updatedProduct = null;

    for await (const change of stream) {
      if (location) {
        updatedProduct = change.fullDocument;
      } else {
        try {
          const response = await fetch(utils.apiInfo.dataUri + '/action/findOne', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': 'Bearer ' + utils.apiInfo.accessToken,
            },
            body: JSON.stringify({
              dataSource: 'mongodb-atlas',
              database: utils.dbInfo.dbName,
              collection: "products_area_view",
              filter: { _id: { $oid: product._id}}
            }),
          });
          const data = await response.json();
          updatedProduct = JSON.parse(JSON.stringify(data.document));
        } catch (error) {
          console.error(error);
        }
      }
    
      setProduct(JSON.parse(JSON.stringify(updatedProduct)));
    }
  };

  const startWatchDashboard = async (dashboard, utils) => {
    console.log("Start watching stream");
    const runs = await getMongoCollection(utils.dbInfo.dbName, "transactions");
    const filter = {
      filter: {
        operationType: "insert",
        "fullDocument.type": "outbound"
      }
    };

    const stream = runs.watch(filter);

    closeStreamDashboard = () => {
      console.log("Closing stream");
      stream.return();
    };

    for await (const change of stream) {
      dashboard.refresh();
    }
  };

  const startWatchInventoryCheck = async (dashboard, addAlert, utils) => {
    console.log("Start watching stream");
    const runs = await getMongoCollection(utils.dbInfo.dbName, "inventoryCheck");
    const filter = {
      filter: {
        operationType: "insert"
      }
    };

    const stream = runs.watch(filter);

    closeStreamInventoryCheck = () => {
      console.log("Closing stream");
      stream.return();
    };

    for await (const change of stream) {
      console.log(change.fullDocument);
      addAlert(change.fullDocument.checkResult);
      dashboard.refresh();
    }
  };

  const startWatchControl = async (setProducts, utils) => {
    console.log("Start watching stream");
    const runs = await getMongoCollection(utils.dbInfo.dbName, "products");
    const filter = {filter: {operationType: "update"}};
    const stream = runs.watch(filter);

    closeStreamControl = () => {
      console.log("Closing stream");
      stream.return();
    };

    for await (const change of stream) {
      const updatedProduct = JSON.parse(JSON.stringify(change.fullDocument));

      setProducts((prevProducts) => {
        const updatedIndex = prevProducts.findIndex((product) => product._id === updatedProduct._id);
        if (updatedIndex !== -1) {
          const updatedProducts = [...prevProducts];
          updatedProducts[updatedIndex] = updatedProduct;
          return updatedProducts;
        } else {
          return prevProducts;
        }
      });
    }
  };

  const stopWatchProductList = () => {
    if (closeStreamProductList) closeStreamProductList();
  };

  const stopWatchProductDetail = () => {
    if (closeStreamProductDetail) closeStreamProductDetail();
  };

  const stopWatchDashboard = () => {
    if (closeStreamDashboard) closeStreamDashboard();
  };

  const stopWatchInventoryCheck = () => {
    if (closeStreamInventoryCheck) closeStreamInventoryCheck();
  };

  const stopWatchControl = () => {
    if (closeStreamControl) closeStreamControl();
  };

  return (
    <UserContext.Provider value={{ 
      currentUser,
      startWatchProductList, 
      stopWatchProductList, 
      startWatchProductDetail, 
      stopWatchProductDetail,
      startWatchDashboard,
      stopWatchDashboard,
      startWatchInventoryCheck,
      stopWatchInventoryCheck,
      startWatchControl,
      stopWatchControl
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserProvider;