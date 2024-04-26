import { getEdgeClientPromise } from '../../../lib/mongodb';
import { ObjectId } from 'bson';

let client = null;

export default async (req, res) => {
    try {
        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;

        if (!client) {
            client = await getEdgeClientPromise();
        }
        const db = client.db(dbName);

        const id = req.query.id;

        let filter = id ? {_id: new ObjectId(id)} : {};

        const products = await db
            .collection("products")
            .find(filter)
            .toArray();
        
        res.status(200).json({ products });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error fetching products' });
    }
 };