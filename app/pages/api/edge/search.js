import { edgeClientPromise } from '../../../lib/mongodb';

export default async (req, res) => {
    try {
        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;
        const client = await edgeClientPromise;
        const db = client.db(dbName);

        const collection = req.query.collection;
        const query = req.body;

        const result = await db
            .collection(collection)
            .find({
                $or: [
                  {name: {$regex: `\W*(${query})\W*`, $options: "i"}},
                  {description: {$regex: `\W*(${query})\W*`, $options: "i"}},
                  {"items.name": {$regex: `\W*(${query})\W*`, $options: "i"}}
                  ]
              })
            .toArray();

        res.status(200).json({documents: result});
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error searching' });
    }
 };