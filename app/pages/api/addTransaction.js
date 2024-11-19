import { getClientPromise } from '../../lib/mongodb';
import { ObjectId } from 'bson';

let client = null;

export default async (req, res) => {
    try {

        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;
        if (!client) {
            client = await getClientPromise();
        }
        const db = client.db(dbName);

        const transaction = req.body;

        const placementTimestamp = new Date();

        const status = {
            name: transaction.type === "inbound" ? 'placed' : 'picked',
            update_timestamp: placementTimestamp
        };

        transaction.placement_timestamp = placementTimestamp;
        transaction.items.forEach(item => item.status.push(status));
        transaction.items.forEach(item => item.product.id = new ObjectId(item.product.id));
        if (transaction.user_id) transaction.user_id = new ObjectId(transaction.user_id);
        if (transaction.location.destination.id) transaction.location.destination.id = new ObjectId(transaction.location.destination.id);
        if (transaction.location.origin.id) transaction.location.origin.id = new ObjectId(transaction.location.origin.id);

        var insertTransactionResponse = null;

        insertTransactionResponse = await db.collection("transactions").insertOne(transaction);

        for (let i = 0; i < transaction.items?.length; i++) {
            let item = transaction.items[i];
            let productID = item.product.id;
            let sku = item.sku;
            let amount = item.amount;
            
            if (transaction.type === "inbound") {
                await db.collection("products").updateOne(
                    {
                        "_id": new ObjectId(productID)
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
                        { "k.location.id": new ObjectId(transaction.location.destination.id) }
                    ]
                    }
                );
            } else {
                await db.collection("products").updateOne(
                    {
                        "_id": new ObjectId(productID)
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
                        { "j.location.id": new ObjectId(transaction.location.origin.id) }
                    ]
                    }
                );
            }

        }

        console.log('Transaction successfully committed.');

        res.status(200).json({ success: true, transactionId: insertTransactionResponse.insertedId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error adding transaction' });
    }
 };