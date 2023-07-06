exports = async function(changeEvent) {
    var docId = changeEvent.fullDocument._id;
    
    //Auto increment order_number
    const countercollection = context.services.get("IST-Shared").db(changeEvent.ns.db).collection("counters");
    const ordercollection = context.services.get("IST-Shared").db(changeEvent.ns.db).collection(changeEvent.ns.coll);
    
    var counter = await countercollection.findOneAndUpdate({_id: changeEvent.ns },{ $inc: { seq_value: 1 }}, { returnNewDocument: true, upsert : true});
    var updateRes = await ordercollection.updateOne({_id : docId},{ $set : {order_number : counter.seq_value}});
    
    //Stock updates
    const productcollection = context.services.get("IST-Shared").db(changeEvent.ns.db).collection("products");
    var orderedItems = changeEvent.fullDocument.items;
    
    for (let i = 0; i < orderedItems.length; i++) {
        let orderedItem = orderedItems[i];
        let productID = orderedItem.product.id.$oid;
        let sku = orderedItem.sku;
        let amount = orderedItem.amount;

        await productcollection.updateOne(
            {
                "_id": new BSON.ObjectId(productID)
            },
            {
              $inc: {
                "items.$[i].stock.$[j].amount": -amount,
                "items.$[i].stock.$[k].amount": amount,
                "total_stock_sum.$[j].amount": -amount,
                "total_stock_sum.$[k].amount": amount
              }
            },
            {
              arrayFilters: [
                { "i.sku": sku },
                { "j.location": "warehouse" },
                { "k.location": "ordered" }
              ]
            }
          );
    
    }
    
    console.log(`Updated ${JSON.stringify(changeEvent.ns)} with counter ${counter.seq_value} result : ${JSON.stringify(updateRes)}`);
};
