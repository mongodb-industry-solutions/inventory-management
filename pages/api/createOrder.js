import clientPromise from '../../lib/mongodb';

export default async (req, res) => {
    try {
        const client = await clientPromise;
        const { ObjectId } = require('mongodb');
        const db = client.db("interns_mongo_retail");

        const { order } = req.body;

        const transactionOptions = {
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' },
            readPreference: 'primary'
          };

        const session = client.startSession();
        
        try{
            session.startTransaction(transactionOptions);

            await db.collection("orders").insertOne(order, { session });

            for (let i = 0; i < order.items?.length; i++) {
                let item = order.items[i];
                let productID = item.product.id.$oid;
                let sku = item.sku;
                let amount = item.amount;
        
                await db.collection("products").updateOne(
                    {
                        "_id": new ObjectId(productID)
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
                    ],
                     session 
                    }
                );
            }
            await session.commitTransaction();
            console.log('Transaction successfully committed.');
        }
        catch(e){
            console.log('An error occured in the transaction, performing a data rollback:' + e);
            await session.abortTransaction();
        }
        finally{
            await session.endSession();
        }
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error creating order' });
    }
 };