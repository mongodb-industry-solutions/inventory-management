exports = async function(request, response){
  
  try {
    if(request.body === undefined) {
      throw new Error(`Request body was not defined.`);
    }
    
    var serviceName = "mongodb-atlas";
    var dbName = "inventory_management_demo";

    const client = context.services.get(serviceName);
    var transactions = client.db(dbName).collection("transactions");
    var products = client.db(dbName).collection("products");
    
    const transaction = JSON.parse(request.body.text());
  
    const placementTimestamp = new Date();
  
    const status = {
      name: transaction.type === "inbound" ? 'placed' : 'picked',
      update_timestamp: placementTimestamp
    };
    
    transaction.placement_timestamp = placementTimestamp;
    transaction.items.forEach(item => item.status.push(status));
    transaction.items.forEach(item => item.product.id = new BSON.ObjectId(item.product.id));
    if (transaction.user_id) transaction.user_id = new BSON.ObjectId(transaction.user_id);
    if (transaction.location.destination.id) transaction.location.destination.id = new BSON.ObjectId(transaction.location.destination.id);
    if (transaction.location.origin.id) transaction.location.origin.id = new BSON.ObjectId(transaction.location.origin.id);
    
    var insertTransactionResponse = null;
    
    const transactionOptions = {
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        readPreference: 'primary'
      };
  
    const session = client.startSession();
    
    try {
      session.startTransaction(transactionOptions);
  
      insertTransactionResponse = await transactions.insertOne(transaction, { session });
      
      for(let i = 0; i < transaction.items.length; i++) {
        let item = transaction.items[i];
        let sku = item.sku;
        let amount = parseInt(item.amount, 10);

        if (transaction.type === "inbound") {
          await products.updateOne(
              {
                  "_id": item.product.id
              },
              {
              $inc: {
                  "items.$[i].stock.$[j].amount": -amount,
                  "items.$[i].stock.$[k].ordered": amount,
                  "total_stock_sum.$[j].amount": -amount,
                  "total_stock_sum.$[k].ordered": amount
              }
              },
              {
              arrayFilters: [
                  { "i.sku": sku },
                  { "j.location.type": "warehouse" },
                  { "k.location.id": transaction.location.destination.id }
              ],
              session 
              }
          );
        } else {
          await products.updateOne(
              {
                  "_id": item.product.id
              },
              {
              $inc: {
                  "items.$[i].stock.$[j].amount": amount,
                  "total_stock_sum.$[j].amount": amount
              }
              },
              {
              arrayFilters: [
                  { "i.sku": sku },
                  { "j.location.id": transaction.location.origin.id }
              ],
              session 
              }
          );
        }
      }
      await session.commitTransaction();
      console.log('Transaction successfully committed.');
      if(response) {
        response.setStatusCode(200);
        response.setBody(JSON.stringify({
           success: true
        }));
      }
  
    } catch(error) {
      console.log('An error occured in the transaction, performing a data rollback:' + error);
      await session.abortTransaction();
      if(response) {
        response.setStatusCode(500);
        response.setBody(JSON.stringify(error.message));
      }
    }
    finally {
      await session.endSession();
    }
  } catch(error) {
    console.log(error);
    if(response) {
      response.setStatusCode(500);
      response.setBody(JSON.stringify(error.message));
    }
  }

};