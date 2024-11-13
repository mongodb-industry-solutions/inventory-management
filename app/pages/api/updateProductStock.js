import { getClientPromise } from '../../lib/mongodb';
import { ObjectId } from 'bson';

let client = null;

export default async (req, res) => {
    try {
        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"');
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;
        
        // Initialize the MongoDB client if it hasn't been initialized yet
        if (!client) {
            client = await getClientPromise();
        }
        const db = client.db(dbName);

        const product = req.body;
        const locationId = req.query.location_id;

        // Update item stock
        for (const item of product.items) {
            // Find the updated stock for the given location
            const updatedStock = item.stock.find((stock) => stock.location.id === locationId);
            updatedStock.location.id = new ObjectId(updatedStock.location.id);

            // Update the stock information for the product
            await db.collection("products").updateOne(
                { "_id": new ObjectId(product._id) },
                { "$set": 
                    { 
                        'items.$[i].stock.$[j]': updatedStock
                    } 
                }, 
                {
                    arrayFilters: [
                        { 'i.sku': item.sku },
                        { "j.location.id": new ObjectId(locationId) }
                    ],
                }
            );
        }

        // Update total stock
        const updatedTotalStockSum = product.total_stock_sum.find((stock) => stock.location.id === locationId);
        updatedTotalStockSum.location.id = new ObjectId(updatedTotalStockSum.location.id);

        await db.collection("products").updateOne(
            { "_id": new ObjectId(product._id) },
            { $set: 
                { 
                    'total_stock_sum.$[j]': updatedTotalStockSum
                } 
            },
            {
                arrayFilters: [
                    { "j.location.id": new ObjectId(locationId) }
                ]
            }
        );
        
        console.log(`Items successfully updated.`);
        
        // Send a success response
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        // Return an error response if an exception is caught
        res.status(500).json({ error: 'Error resetting stock' });
    }
};

/*
Changes made:
1. Replaced the import of `getEdgeClientPromise` with `getClientPromise` to remove edge-related references.
2. Removed any logic distinguishing between server types, treating the server as primary.
3. Added inline comments to explain each part of the code, especially the stock update logic.
*/