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

        const productIdList  = req.body;

        const stock = [
            {"location": "store","amount": 20,"threshold": 10,"target": 20},
            {"location": "ordered","amount": 0},
            {"location": "warehouse","amount": 80}
        ];
        const totalStock = [
            {"location": "store","amount": 100,"threshold": 50,"target": 100},
            {"location": "ordered","amount": 0},
            {"location": "warehouse","amount": 400}
        ];

        const bulkUpdateOps = productIdList.map((productId) => ({
            updateOne: {
                filter: { "_id": new ObjectId(productId) },
                update: { $set: {
                    "items.$[].stock": stock,
                    "total_stock_sum": totalStock,
                    "autoreplenishment": false
                } }
            },
        }));
        
        // Perform the bulk write operation to update the items
        const bulkWriteResult = await db.collection("products").bulkWrite(bulkUpdateOps);

        console.log(`Updated ${bulkWriteResult.modifiedCount} products in the collection.`);
        res.status(200).json({ success: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error reseting stock' });
    }
};