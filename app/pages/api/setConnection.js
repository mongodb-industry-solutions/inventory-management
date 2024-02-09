export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    const { action } = req.body;

    if (!action || (action !== 'enable' && action !== 'disable')) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    try {
        const { exec } = require('child_process');
        const command = `../edge_server/bin/demo/edge-connection.sh ${action}`;
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
            console.error(`Error executing command: ${command}`, error);
            return res.status(500).json({ error: 'Internal Server Error' });
            }
            
            return res.status(200).json({ success: true });
        });
    } catch (error) {
        console.error('Error executing command:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

};