import clientPromise from '../../lib/mongodb';

export default async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db("interns_mongo_retail");

        const { order } = req.body; 
 
        await db.collection("orders").insertOne(order);
 
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error creating order' });
    }
 };