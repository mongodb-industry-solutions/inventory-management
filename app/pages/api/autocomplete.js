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
            const response = await db
                .collection(collection)
                .find({
                    $or: [
                        { name: { $regex: `\W*(${query})\W*`, $options: "i" } },
                        { description: { $regex: `\W*(${query})\W*`, $options: "i" } },
                        { "items.name": { $regex: `\W*(${query})\W*`, $options: "i" } }
                    ]
                })
                .limit(5) // Limit the results to 5 documents
                .project({
                    suggestion: { $concat: ["$name", " - ", "$code"] },
                    _id: 0,
                })
                .toArray();

            if (response.length > 0) {
                // Extract the suggestions and insert them into the first element of the result array
                const suggestions = response.reduce((acc, curr) => {
                    acc.push(curr.suggestion);
                    return acc;
                }, []);
                
                result.push({ suggestions: suggestions });
            }
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
                .limit(5) // Limit the results to 5 documents
                .toArray();

            if (transactions.length > 0) {
                // Extract relevant suggestions from the transaction items
                const projection = transactions.flatMap(transaction =>
                    transaction.items.map(item => (`${item.product.name} - ${item.sku}`))
                ).slice(0, 5);

                // Remove duplicates and limit suggestions to 5
                const suggestions = Array.from(new Set(projection)).slice(0, 5);

                result.push({ suggestions: suggestions });
            }
        }

        // Return the search results
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