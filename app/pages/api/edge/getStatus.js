import util from 'util';
import { exec } from 'child_process';

const execAsync = util.promisify(exec);

export default async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).end();
    }

    try {
        if (!process.env.EDGE_SERVER_HOST) {
            throw new Error('Invalid/Missing environment variables: "EDGE_SERVER_HOST"')
        }

        const edgeHost = process.env.EDGE_SERVER_HOST;
    
        const response = await fetch(`http://${edgeHost}:80/api/client/v2.0/tiered-sync/status`);
        const status = await response.json();

        res.status(200).json(status);
        
    } catch (error) {
        console.error('Error fetching status:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};