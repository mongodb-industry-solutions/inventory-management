exports = async function(request, response){
  
  try {
    if(request.body === undefined) {
      throw new Error(`Request body was not defined.`);
    }
    
    var serviceName = "mongodb-atlas";
    var dbName = "inventory_management_demo";

    // Get collections from the context
    const client = context.services.get(serviceName);
    var products = client.db(dbName).collection("products");
    
      
    //const product = JSON.parse(request.body.text());
    const locationId = request.query.location_id;
    
    // Convert numeric values to integers
    const product = JSON.parse(request.body.text(), (key, value) => {
        return typeof value === 'number' ? parseInt(value, 10) : value;
    });
  
    // Update item stock
    const bulkUpdateOps = product.items.map((item) => {

        const updatedStock = item.stock.find((stock) => stock.location.id === locationId);
        updatedStock.location.id = new BSON.ObjectId(updatedStock.location.id);

        return {
            updateOne: {
                filter: { "_id": new BSON.ObjectId(product._id) },
                update: { $set: 
                    { 
                        'items.$[i].stock.$[j]': updatedStock
                    } 
                },
                arrayFilters: [
                    { 'i.sku': item.sku },
                    { "j.location.id": new BSON.ObjectId(locationId) }
                ],
            }
        };
    });

    // Update total stock
    const updatedTotalStockSum = product.total_stock_sum.find((stock) => stock.location.id === locationId);
    updatedTotalStockSum.location.id = new BSON.ObjectId(updatedTotalStockSum.location.id);

    bulkUpdateOps.push({
        updateOne: {
            filter: { "_id": new BSON.ObjectId(product._id) },
            update: { $set: 
                { 
                    'total_stock_sum.$[j]': updatedTotalStockSum
                } 
            },
            arrayFilters: [
                { "j.location.id": new BSON.ObjectId(locationId) }
            ],
        }
    });

    // Perform the bulk write operation to update the items
    const bulkWriteResult = await products.bulkWrite(bulkUpdateOps);
    
    console.log(`Items successfully updated.`);
    
    response.setStatusCode(200);
    response.setBody(JSON.stringify({
       success: true
    }));
  
   
  } catch(error) {
    response.setStatusCode(500);
    response.setBody(JSON.stringify(error.message));
  }

};