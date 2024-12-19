// /pages/api/getIndustry.js

export default function handler(req, res) {
    if (req.method === 'GET') {
        // Extract the industry from environment variables
        const industry = process.env.DEMO_INDUSTRY || 'retail';

        // Send the response with the industry value
        res.status(200).json({ industry });
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
