exports = async function (changeEvent) {
  
  try {
    
    var serviceName = "mongodb-atlas";
    var dbName = "inventory_management_demo";
    
    const client = context.services.get(serviceName);
    var locations = client.db(dbName).collection("locations");
    
    const product = changeEvent.fullDocument;
    const prevProduct = changeEvent.fullDocumentBeforeChange;
  
    const pattern = /^items\.(\d+)\.stock\.(\d+)/;
    //console.log("Update fileds: " + JSON.stringify(changeEvent.updateDescription.updatedFields));
  
    for (const key of Object.keys(changeEvent.updateDescription.updatedFields)) {
    
      if (pattern.test(key)) {
        let item = product.items[parseInt(key.match(pattern)[1], 10)];
        let itemStock = item.stock[parseInt(key.match(pattern)[2], 10)];
        let itemBeforeChange = prevProduct.items[parseInt(key.match(pattern)[1], 10)];
        
        let locationId = String(itemStock.location.id);
        
        let itemBeforeChangeStock = itemBeforeChange.stock.find(stock => String(stock.location.id) === locationId);
        
        if (itemStock.amount < itemStock.threshold && itemStock.amount < itemBeforeChangeStock.amount) {
            
            var replenishAmount = parseInt(itemStock.target - itemStock.amount, 10);
            
            var location = await locations.findOne({_id: new BSON.ObjectId(locationId)});
            
            var transaction = {
                type: 'inbound',
                location: {
                  origin: {
                      type: 'warehouse'
                  },
                  destination: {
                      type: location.type,
                      id: location._id,
                      name: location.name,
                      area_code: location.area_code
                  }
                },
                placement_timestamp: new Date(),
                items: [],
                automatic: true
            };
            
            var newItem = EJSON.parse(EJSON.stringify(item));
            delete newItem.stock;
            newItem.status = [];
            newItem.amount = replenishAmount;
            newItem.product = {
                id: product._id,
                name: product.name,
                ... (product.color && {
                    color: {
                        name: product.color?.name,
                        hex: product.color?.hex
                    },
                }),
                ... (product.image && {
                  image: {
                    url: product.image?.url
                  },
                })
            };
            
            transaction.items.push(newItem);
            
            const request = {body: { text: () => JSON.stringify(transaction) }};
            
            // Add automatic transaction
            await context.functions.execute("addTransaction", request, null);
            
            console.log(`Item ${item.sku} was low stock. ${replenishAmount} units have been replenished.`);

        }
      }
    }
    
  } catch (error) {
    console.log(error);
  }
};
