import { getClientPromise } from '../../lib/mongodb';

let client = null;

export default async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).end(); // Method Not Allowed
    }

    try {
        if (!client) {
            client = await getClientPromise();
        }
        const db = client.db(process.env.MONGODB_DATABASE_NAME);
        
        // Use a MongoDB command to check status
        const status = await db.admin().ping();

        // Send the MongoDB server status as the response
        res.status(200).json({ status: status.ok === 1 ? 'MongoDB is healthy' : 'MongoDB is down' });
        
    } catch (error) {
        console.error('Error fetching status:', error);
        // Return an error response if an exception is caught
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
