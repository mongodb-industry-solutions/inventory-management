import { getClientPromise } from '../../lib/mongodb';

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

        // Fetch all users from the "users" collection
        const users = await db
            .collection("users")
            .find({})
            .toArray();

        // Send the fetched users as a response
        res.status(200).json({ documents: users });
    } catch (e) {
        console.error(e);
        // Return an error response if an exception is caught
        res.status(500).json({ error: 'Error fetching users' });
    }
};

/*
Changes made:
1. Replaced the import of `getEdgeClientPromise` with `getClientPromise` to remove edge-related references.
2. Removed any logic distinguishing between server types, treating the server as primary.
3. Added inline comments to explain each part of the code, especially the database connection and user fetching logic.
*/