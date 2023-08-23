import clientPromise from '../../lib/mongodb';

export default async (req, res) => {
    try {

        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;
        const client = await clientPromise;
        const { ObjectId } = require('mongodb');
        const db = client.db(dbName);

        const { order } = req.body;
        const placementTimestamp = new Date();

        const status = {
            name: 'placed',
            update_timestamp: placementTimestamp
        };

        order.placement_timestamp = placementTimestamp;
        order.items.forEach(item => item.status.push(status));
        order.items.forEach(item => item.product.id = new ObjectId(item.product.id));

        var insertOrderResponse = null;

        const transactionOptions = {
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' },
            readPreference: 'primary'
          };

        const session = client.startSession();
        
        try{
            session.startTransaction(transactionOptions);

            insertOrderResponse = await db.collection("orders").insertOne(order, { session });

            for (let i = 0; i < order.items?.length; i++) {
                let item = order.items[i];
                let productID = item.product.id;
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
        res.status(200).json({ success: true, orderId: insertOrderResponse.insertedId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error creating order' });
    }
 };