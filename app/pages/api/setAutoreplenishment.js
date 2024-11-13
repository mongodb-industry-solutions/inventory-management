import { getClientPromise } from '../../lib/mongodb';
import { ObjectId } from 'bson';

let client = null;

export default async (req, res) => {
    try {
        // Extract relevant data from the request body
        const { update, filter, database, collection } = req.body;

        // Initialize the MongoDB client if it hasn't been initialized yet
        if (!client) {
            client = await getClientPromise();
        }
        const db = client.db(database);
        
        // Convert the product ID from string to ObjectId
        const productId = new ObjectId(filter._id.$oid);
        const autoStatus = update.$set.autoreplenishment;

        // Update the specified document in the collection
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
            
        // Send a success response
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        // Return an error response if an exception is caught
        res.status(500).json({ error: 'Error creating order' });
    }
};

/*
Changes made:
1. Replaced the import of `getEdgeClientPromise` with `getClientPromise` to remove edge-related references.
2. Removed any logic distinguishing between server types, treating the server as primary.
3. Added inline comments to explain each part of the code, especially the update logic.
*/
