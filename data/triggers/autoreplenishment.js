/* FUNCTION */
exports = async function (changeEvent) {

    const ordercollection = context.services.get("<your-cluster-name>").db(changeEvent.ns.db).collection("orders");
    const storecollection = context.services.get("<your-cluster-name>").db(changeEvent.ns.db).collection("stores");
    const productcollection = context.services.get("<your-cluster-name>").db(changeEvent.ns.db).collection(changeEvent.ns.coll);

    const pattern = /^items\.(\d+)\.stock/;
    console.log("Update fileds: " + JSON.stringify(changeEvent.updateDescription.updatedFields));

    for (const key of Object.keys(changeEvent.updateDescription.updatedFields)) {
        if (pattern.test(key)) {
            let item = changeEvent.fullDocument.items[parseInt(key.match(pattern)[1], 10)];
            let itemStoreStock = {};
            let itemBeforeChange = changeEvent.fullDocumentBeforeChange.items[parseInt(key.match(pattern)[1], 10)];
            
            //Find store where stock has changed
            item.stock.forEach(stock => {
              const prevStock = itemBeforeChange.stock.find(s => s.location.id === stock.location.id);

              if (prevStock != stock & stock.location.type == "store") {
                itemStoreStock = stock;
              }
            });
            
            let storeId = String(itemStoreStock.location.id);
            
            
            let itemBeforeChangeStoreStock = itemBeforeChange.stock.find(stock => String(stock.location.id) === storeId);

            if (itemStoreStock.amount < itemStoreStock.threshold && itemStoreStock.amount < itemBeforeChangeStoreStock.amount) {
                
                var replenishAmount = itemStoreStock.target - itemStoreStock.amount;
                
                var store = await storecollection.findOne({_id: new BSON.ObjectId(storeId)});
                
                var newOrder = {
                    location: {
                      origin: {
                          type: 'warehouse'
                      },
                      destination: {
                          type: 'store',
                          id: store._id,
                          name: store.name,
                          area_code: store.area_code
                      }
                    },
                    placement_timestamp: new Date(),
                    items: [
                        {
                            amount: replenishAmount,
                            color: {
                              name: changeEvent.fullDocument.color.name,
                              hex: changeEvent.fullDocument.color.hex
                            },
  
                            delivery_time: item.delivery_time,
                            product: {
                                id: changeEvent.fullDocument._id,
                                name: changeEvent.fullDocument.name
                            },
                            size: item.size,
                            sku: item.sku,
                            status: [
                                {
                                    name: "placed",
                                    update_timestamp: new Date()
                                }
                            ]
                        }
                    ],
                    order_number: null,
                    type: "auto"
                };
                
                //Simulate placement
                var insertedOrder = await ordercollection.insertOne(newOrder);
                
                await productcollection.updateOne(
                    {
                        _id: changeEvent.fullDocument._id
                    },
                    {
                        $inc: {
                            "items.$[i].stock.$[j].amount": -replenishAmount,
                            "items.$[i].stock.$[k].ordered": replenishAmount,
                            "total_stock_sum.$[j].amount": -replenishAmount,
                            "total_stock_sum.$[k].ordered": replenishAmount
                        }
                    },
                    {
                        arrayFilters: [
                            { "i.sku": item.sku },
                            { "j.location.type": "warehouse" },
                            { "k.location.id": new BSON.ObjectId(storeId) }
                        ]
                    }
                );
                
                //Simulate arrival
                await new Promise(r => setTimeout(r, item.delivery_time.amount * 1000));
                
                  var arrivedStatus =  {
                    name: "arrived",
                    update_timestamp: new Date()
                };
                
                await ordercollection.updateOne(
                    {
                        _id: insertedOrder.insertedId
                    },
                    {
                        $push: { "items.$[i].status": arrivedStatus }
                    },
                    {
                        arrayFilters: [
                            { "i.sku": item.sku }
                        ]
                    }
                );
                
                await productcollection.updateOne(
                    {
                        _id: changeEvent.fullDocument._id
                    },
                    {
                        $inc: {
                            "items.$[i].stock.$[j].ordered": -replenishAmount,
                            "items.$[i].stock.$[j].amount": replenishAmount,
                            "total_stock_sum.$[j].ordered": -replenishAmount,
                            "total_stock_sum.$[j].amount": replenishAmount
                        }
                    },
                    {
                        arrayFilters: [
                            { "i.sku": item.sku },
                            { "j.location.id": new BSON.ObjectId(storeId) }
                        ]
                    }
                );
                
                console.log(`Item ${item.sku} was low stock. ${replenishAmount} units have been replenished.`);

            }
        }
    }
    
    console.log(`Updated ${JSON.stringify(changeEvent.ns)}.`);
};

/* MATCH  EXPRESSION */
var match = {
    "fullDocument.autoreplenishment": true
};