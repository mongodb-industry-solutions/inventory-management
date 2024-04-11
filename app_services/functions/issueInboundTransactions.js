exports = async function(changeEvent) {
  try {
    
    var serviceName = "mongodb-atlas";
    var dbName = "inventory_management_demo";
    var transactionId = changeEvent.fullDocument._id;
    
    const client = context.services.get(serviceName);
    var transactions = client.db(dbName).collection("transactions");
    var counters = client.db(dbName).collection("counters");
    
    var counter = await counters.findOneAndUpdate({_id: changeEvent.ns },{ $inc: { seq_value: 1 }}, { returnNewDocument: true, upsert : true});
    var updateRes = await transactions.updateOne({_id : transactionId},{ $set : {transaction_number : counter.seq_value}});
    
    //If inbound transaction simulate item delivery
    if(changeEvent.fullDocument.type === "inbound") {
      const fetchPromises = [];
      
      for(const item of changeEvent.fullDocument.items){
        fetchPromises.push(context.functions.execute("simulateItemDelivery", item, changeEvent.fullDocument._id));
      }
      
      await Promise.all(fetchPromises);
    }
    
  } catch(err) {
    console.log(err.message);
  }
};
