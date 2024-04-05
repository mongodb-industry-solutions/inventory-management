import util from 'util';
import { exec } from 'child_process';

const execAsync = util.promisify(exec);

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }
    if (!process.env.EDGE_SERVER_HOST) {
        throw new Error('Invalid/Missing environment variables: "EDGE_SERVER_HOST"')
    }
    if (!process.env.REMOTE_EDGE_USER) {
        throw new Error('Invalid/Missing environment variables: "REMOTE_EDGE_USER"')
    }

    const { action } = req.body;
    const edgeHost = process.env.EDGE_SERVER_HOST;
    const remoteEdgeUser = process.env.REMOTE_EDGE_USER;

    if (!action || (action !== 'enable' && action !== 'disable')) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    try {
        const command = edgeHost == 'localhost' || edgeHost == '127.0.0.1' ?
            `../edge_server/bin/demo/edge-connection.sh ${action}`:
            `ssh -i ./gcp_ssh_key ${remoteEdgeUser}@${edgeHost} 'cd edge_server; ./bin/demo/edge-connection.sh ${action}'`;

        const { stdout, stderr } = await execAsync(command);
        console.log(`Command output (stdout): ${stdout}`);

        if (stderr) {
            console.error(`Command output (stderr): ${stderr}`);
            return res.status(500).json({ error: 'Command execution failed' });
        } else {
            return res.status(200).json({ success: true });
        }
        
    } catch (error) {
        console.error('Error executing command:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

};