import React, { createContext, useContext, useState, useEffect } from 'react';
import { App, Credentials } from "realm-web";
import { ObjectId } from "bson";

const STORAGE_KEY = 'selectedUser';

const app = new App(process.env.NEXT_PUBLIC_REALM_APP_ID);

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [selectedUser, setSelectedUser] = useState(null);

  const credentials = Credentials.anonymous();
  let closeStreamProductList;
  let closeStreamProductDetail;
  let closeStreamDashboard;
  let closeStreamControl;

  useEffect(() => {
    // Load the selected user from local storage on component mount
    const storedUser = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (storedUser && !selectedUser) {
      setSelectedUser(storedUser);
    }
  }, []);
  
  const setUser = (user) => {
    setSelectedUser(user);
    // Save the selected user to local storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  };

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

const  startWatchProductList = async (setDisplayProducts, addAlert, location, utils ) => {
    console.log("Start watching stream");
    const runs = await getMongoCollection(utils.dbInfo.dbName, "products");
    const filter = {filter: {operationType: "update"}};
    const stream = runs.watch(filter);

    closeStreamProductList = () => {
      console.log("Closing stream");
      stream.return(null)
    };

    let updatedProduct = null;

    for await (const  change  of  stream) {
      console.log("Change detected");
      
      if (location) { 
        updatedProduct = JSON.parse(JSON.stringify(change.fullDocument));
      }
      else {
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
          
          if(itemStock?.amount + itemStock?.ordered  < itemStock?.threshold) {
            item.product_id = updatedProduct._id;
            addAlert(item);
          }
        }
      }
    }
  };

  const  startWatchProductDetail = async (setProduct, product, location, utils ) => {
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
      stream.return(null)
    };

    let updatedProduct = null;

    for await (const  change  of  stream) {
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

  const  startWatchDashboard = async (dashboard, utils) => {
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
      stream.return(null)
    };

    for await (const  change  of  stream) {
      dashboard.refresh();
    }
  };

  const  startWatchControl = async (setProducts, utils) => {
    console.log("Start watching stream");
    const runs = await getMongoCollection(utils.dbInfo.dbName, "products");
    const filter = {filter: {operationType: "update"}};

    const stream = runs.watch(filter);


    closeStreamControl = () => {
      console.log("Closing stream");
      stream.return(null)
    };

    for await (const  change  of  stream) {
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
    closeStreamProductList();
  };

  const stopWatchProductDetail = () => {
    closeStreamProductDetail();
  };

  const stopWatchDashboard = () => {
    closeStreamDashboard();
  };



  const stopWatchControl = () => {
    closeStreamControl();
  };

  return (
    <UserContext.Provider value={{ selectedUser, 
      setUser, 
      startWatchProductList, 
      stopWatchProductList, 
      startWatchProductDetail, 
      stopWatchProductDetail,
      startWatchDashboard,
      stopWatchDashboard,
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
