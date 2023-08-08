import clientPromise from '../../lib/mongodb';

export default async (req, res) => {
    try {
        const client = await clientPromise;
        const { ObjectId } = require('mongodb');
        const db = client.db("interns_mongo_retail");

        const active  = req.body;
        const productId = req.query.product_id;

        await db.collection("products").updateOne(
            {
                "_id": new ObjectId(productId)
            },
            [{
                $set: {
                    "autoreplenishment": active
                }
            }]
        );
            
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error creating order' });
    }
 };