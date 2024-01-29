import { update } from 'lodash';
import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

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
        const storeId = req.query.store_id;

        // Update item stock
        const bulkUpdateOps = product.items.map((item) => {

            const updatedStock = item.stock.find((stock) => stock.location.id === storeId);
            updatedStock.location.id = new ObjectId(updatedStock.location.id);

            return {
                updateOne: {
                    filter: { "_id": new ObjectId(product._id) },
                    update: { $set: 
                        { 
                            'items.$[i].stock.$[j]': updatedStock
                        } 
                    },
                    arrayFilters: [
                        { 'i.sku': item.sku },
                        { "j.location.id": new ObjectId(storeId) }
                    ],
                }
            };
        });

        // Update total stock
        const updatedTotalStockSum = product.total_stock_sum.find((stock) => stock.location.id === storeId);
        updatedTotalStockSum.location.id = new ObjectId(updatedTotalStockSum.location.id);

        bulkUpdateOps.push({
            updateOne: {
                filter: { "_id": new ObjectId(product._id) },
                update: { $set: 
                    { 
                        'total_stock_sum.$[j]': updatedTotalStockSum
                    } 
                },
                arrayFilters: [
                    { "j.location.id": new ObjectId(storeId) }
                ],
            }
        });

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