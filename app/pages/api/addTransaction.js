import { getClientPromise } from '../../lib/mongodb';
import { ObjectId } from 'bson';

let client = null;

export default async (req, res) => {
    try {
        // Validate the presence of the MongoDB database name in environment variables
        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;
        
        // Initialize the MongoDB client if it hasn't been initialized yet
        if (!client) {
            client = await getClientPromise();
        }
        const db = client.db(dbName);

        // Get the transaction data from the request body
        const transaction = req.body;
        
        // Set the timestamp for when the transaction is placed
        const placementTimestamp = new Date();

        // Define the initial status of the transaction depending on its type (inbound or outbound)
        const status = {
            name: transaction.type === "inbound" ? 'placed' : 'picked',
            update_timestamp: placementTimestamp
        };

        // Add placement timestamp and update each item's status and product ID
        transaction.placement_timestamp = placementTimestamp;
        transaction.items.forEach(item => item.status.push(status));
        transaction.items.forEach(item => item.product.id = new ObjectId(item.product.id));
        if (transaction.user_id) transaction.user_id = new ObjectId(transaction.user_id);
        if (transaction.location.destination.id) transaction.location.destination.id = new ObjectId(transaction.location.destination.id);
        if (transaction.location.origin.id) transaction.location.origin.id = new ObjectId(transaction.location.origin.id);

        // Insert the transaction document into the "transactions" collection
        var insertTransactionResponse = await db.collection("transactions").insertOne(transaction);

        // Iterate through each item to update the stock information accordingly
        for (let i = 0; i < transaction.items?.length; i++) {
            let item = transaction.items[i];
            let productID = item.product.id;
            let sku = item.sku;
            let amount = item.amount;
            
            // Update product stock based on transaction type (inbound or outbound)
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

        // Return a successful response with the transaction ID
        res.status(200).json({ success: true, transactionId: insertTransactionResponse.insertedId });
    } catch (e) {
        console.error(e);
        // Return an error response if an exception is caught
        res.status(500).json({ error: 'Error adding transaction' });
    }
};

/*
Changes made:
1. Replaced the import of `getEdgeClientPromise` with `getClientPromise` to remove edge-related references.
2. Removed any references to distinguishing between server types, treating the server as primary.
3. Added inline comments to explain each part of the code, especially the transaction insertion and stock update logic.
*/
