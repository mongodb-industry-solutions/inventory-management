import { edgeClientPromise } from '../../../lib/mongodb';
import { ObjectId } from 'bson';

export default async (req, res) => {
    try {

        const { update, filter, database, collection } = req.body;

        const client = await edgeClientPromise;
        const db = client.db(database);
        
        const productId = new ObjectId(filter._id.$oid);
        const autoStatus = update.$set.autoreplenishment;

        await db.collection(collection).updateOne(
            {
                "_id": productId
            },
            [{
                $set: {
                    "autoreplenishment": autoStatus
                }
            }]
        );
            
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error creating order' });
    }
 };