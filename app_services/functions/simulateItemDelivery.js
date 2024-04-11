exports = async function(item, transactionId){
  try {
    var serviceName = "mongodb-atlas";
    var dbName = "inventory_management_demo";
    
    const client = context.services.get(serviceName);
    var transactions = client.db(dbName).collection("transactions");
    var products = client.db(dbName).collection("products");
    
    const productID = item.product.id;
    const sku = item.sku;
    const amount = parseInt(item.amount, 10);
    
    const transaction = await transactions
      .findOne(
          { _id: transactionId },
          { "location.destination.id": 1 }
      );

    const locationId = transaction.location.destination.id;
    
    if(item.delivery_time.unit === 'seconds'){
        await new Promise(r => setTimeout(r, item.delivery_time.amount * 1000));
        
        const status = {
            name: 'arrived',
            update_timestamp: new Date()
        };

        await products.updateOne(
            {
                "_id": productID
            },
            {
            $inc: {
                "items.$[i].stock.$[j].ordered": -amount,
                "items.$[i].stock.$[j].amount": amount,
                "total_stock_sum.$[j].ordered": -amount,
                "total_stock_sum.$[j].amount": amount
            }
            },
            {
                arrayFilters: [
                    { "i.sku": sku },
                    { "j.location.id": locationId }
                ]
            }
        );

        await transactions.updateOne(
            {
                "_id": transactionId
            },
            {
                $push: { "items.$[i].status": status }
            },
            {
                arrayFilters: [
                    { "i.sku": sku }
                ]
            }
        );
        
        console.log(item.sku + ' delivered successfully.');
    }
    else {
        throw new Error(`Error: time units not supported`);
    }
    
  } catch(error) {
    console.log(error.message);
  }
};