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

        const product = req.body;

        // Iterate over the updated items array and build the bulk write operations
        const bulkUpdateOps = product.items.map((item) => ({
            updateOne: {
                filter: { "_id": new ObjectId(product._id) },
                update: { $set: 
                    { 
                        'items.$[i].stock': item.stock,
                        'total_stock_sum': product.total_stock_sum
                    } 
                },
                arrayFilters: [{ 'i.sku': item.sku }],
            },
        }));
        
        // Perform the bulk write operation to update the items
        const bulkWriteResult = await db.collection("products").bulkWrite(bulkUpdateOps);
        
        console.log(`Updated ${bulkWriteResult.modifiedCount} items in the collection.`);
        
        res.status(200).json({ success: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error reseting stock' });
    }
};