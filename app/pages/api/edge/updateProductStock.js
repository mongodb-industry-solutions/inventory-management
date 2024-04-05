import { getEdgeClientPromise } from '../../../lib/mongodb';
import { ObjectId } from 'bson';

export default async (req, res) => {
    try {

        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;
        const client = await getEdgeClientPromise();
        const db = client.db(dbName);

        const product = req.body;
        const locationId = req.query.location_id;

        // Update item stock
        for (const item of product.items) {

            const updatedStock = item.stock.find((stock) => stock.location.id === locationId);
            updatedStock.location.id = new ObjectId(updatedStock.location.id);

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
        
        res.status(200).json({ success: true });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error reseting stock' });
    }
};