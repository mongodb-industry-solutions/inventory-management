/* FUNCTION */
exports = async function (changeEvent) {

    /*TODO: Update the service name with your actual cluster name.*/
    const ordercollection = context.services.get("<your-cluster-name>").db(changeEvent.ns.db).collection("orders");
    const productcollection = context.services.get("<your-cluster-name>").db(changeEvent.ns.db).collection(changeEvent.ns.coll);

    const pattern = /^items\.(\d+)\.stock.0.amount/;

    for (const key of Object.keys(changeEvent.updateDescription.updatedFields)) {
        if (pattern.test(key)) {
            let item = changeEvent.fullDocument.items[parseInt(key.match(pattern)[1], 10)];
            let itemStoreStock = item.stock.find(stock => stock.location === 'store');

            if (itemStoreStock.amount < itemStoreStock.threshold) {

                var replenishAmount = itemStoreStock.target - itemStoreStock.amount;
                
                var newOrder = {
                    user_id: new BSON.ObjectId("649ef73a7827d12200b87895"),
                    location: {
                        origin: "warehouse",
                        destination: "store"
                    },
                    placement_timestamp: new Date(),
                    items: [
                        {
                            amount: replenishAmount,
                            color: item.color,
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
                            "items.$[i].stock.$[k].amount": replenishAmount,
                            "total_stock_sum.$[j].amount": -replenishAmount,
                            "total_stock_sum.$[k].amount": replenishAmount
                        }
                    },
                    {
                        arrayFilters: [
                            { "i.sku": item.sku },
                            { "j.location": "warehouse" },
                            { "k.location": "ordered" }
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
                            "items.$[i].stock.$[j].amount": -replenishAmount,
                            "items.$[i].stock.$[k].amount": replenishAmount,
                            "total_stock_sum.$[j].amount": -replenishAmount,
                            "total_stock_sum.$[k].amount": replenishAmount
                        }
                    },
                    {
                        arrayFilters: [
                            { "i.sku": item.sku },
                            { "j.location": "ordered" },
                            { "k.location": "store" }
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
