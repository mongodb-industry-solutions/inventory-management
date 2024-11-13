import { getClientPromise } from '../../lib/mongodb';
import { ObjectId } from 'bson';

let client = null;

export default async (req, res) => {
    try {
        // Validate the presence of the MongoDB database name in environment variables
        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;
        
        // Initialize the MongoDB client if it hasn't been initialized yet
        if (!client) {
            client = await getClientPromise();
        }
        const db = client.db(dbName);

        // Extract relevant query parameters from the request
        const collection = req.query.collection;
        const type = req.query.type;
        const industry = req.query.industry;
        const location = req.query.location;
        const query = req.body;

        let result = [];

        // Handle search for products collection
        if (collection === 'products') {
            result = await db
                .collection(collection)
                .find({
                    $or: [
                        { name: { $regex: `\W*(${query})\W*`, $options: "i" } },
                        { description: { $regex: `\W*(${query})\W*`, $options: "i" } },
                        { "items.name": { $regex: `\W*(${query})\W*`, $options: "i" } }
                    ]
                })
                .toArray();
        } else if (collection === 'transactions') {
            // Handle search for transactions collection
            
            // Apply location filter if a specific location is provided
            const locationFilter = location
                ? type === 'inbound'
                    ? { 'location.destination.id': new ObjectId(location) }
                    : { 'location.origin.id': new ObjectId(location) }
                : {};

            // Apply industry-specific filter if the industry is manufacturing
            const manufacturingFilter =
                industry === 'manufacturing'
                    ? type === 'inbound'
                        ? { 'items.product.name': { $ne: "Finished Goods" } }
                        : { 'items.product.name': "Finished Goods" }
                    : {};

            // Construct a query filter to match the relevant transaction items
            const queryFilter = {
                $or: [
                    { "items.name": { $regex: `\W*(${query})\W*`, $options: "i" } },
                    { "items.sku": { $regex: `\W*(${query})\W*`, $options: "i" } },
                    { "items.product.name": { $regex: `\W*(${query})\W*`, $options: "i" } },
                ],
            };

            // Combine all filters into a single query
            const combinedFilter = {
                ...locationFilter,
                ...manufacturingFilter,
                ...queryFilter,
            };

            // Fetch matching transactions from the database
            const transactions = await db
                .collection(collection)
                .find(combinedFilter)
                .toArray();
            
            // Extract and flatten the items from transactions if available
            if (transactions.length > 0) {
                result = transactions.flatMap(transaction =>
                    transaction.items.map(item => ({ ...transaction, items: item }))
                );
            }
        }

        // Send the search results as a response
        res.status(200).json({ documents: result });
    } catch (e) {
        console.error(e);
        // Return an error response if an exception is caught
        res.status(500).json({ error: 'Error searching' });
    }
};

/*
Changes made:
1. Replaced the import of `getEdgeClientPromise` with `getClientPromise` to remove edge-related references.
2. Removed any logic distinguishing between server types, treating the server as primary.
3. Added inline comments to explain each part of the code, especially the search logic and filters.
*/
