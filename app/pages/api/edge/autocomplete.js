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

        const collection = req.query.collection;
        const type = req.query.type;
        const industry = req.query.industry;
        const location = req.query.location;
        const query = req.body;

        let result = [];

        if (collection === 'products') {
            const response = await db
                .collection(collection)
                .find({
                    $or: [
                    {name: {$regex: `\W*(${query})\W*`, $options: "i"}},
                    {description: {$regex: `\W*(${query})\W*`, $options: "i"}},
                    {"items.name": {$regex: `\W*(${query})\W*`, $options: "i"}}
                    ]
                })
                .limit(5)
                .project({
                    suggestion: {$concat: ["$name", " - ", "$code"],},
                    _id: 0,
                  })
                .toArray();

                if (response.length > 0) {
                    // Extract the suggestions and insert them into the first element of the array
                    const suggestions = response.reduce((acc, curr) => {
                        acc.push(curr.suggestion);
                        return acc;
                    }, []);
                
                    result.push({suggestions: suggestions});
                }
        } else if (collection === 'transactions') {
            
           const locationFilter = location
                ? type === 'inbound'
                    ? { 'location.destination.id': new ObjectId(location) }
                    : { 'location.origin.id': new ObjectId(location) }
                : {};

            const manufacturingFilter =
                industry === 'manufacturing'
                    ? type === 'inbound'
                    ? { 'items.product.name': { $ne: "Finished Goods" } }
                    : { 'items.product.name': "Finished Goods" }
                    : {};

            const queryFilter = {
                $or: [
                    { "items.name": { $regex: `\W*(${query})\W*`, $options: "i" } },
                    { "items.sku": { $regex: `\W*(${query})\W*`, $options: "i" } },
                    { "items.product.name": { $regex: `\W*(${query})\W*`, $options: "i" } },
                ],
                };

            const combinedFilter = {
                ...locationFilter,
                ...manufacturingFilter,
                ...queryFilter,
                };

            const transactions = await db
                .collection(collection)
                .find(combinedFilter)
                .limit(5)
                .toArray();

            if (transactions.length > 0) {
                const projection = transactions.flatMap(transaction =>
                    transaction.items.map(item => (`${item.product.name} - ${item.sku}`))
                ).slice(0, 5);

                const suggestions = Array.from(new Set(projection)).slice(0, 5);

                result.push({suggestions: suggestions});
            }
            
        }

        res.status(200).json({documents: result});
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error searching' });
    }
 };