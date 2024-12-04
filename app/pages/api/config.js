export default function handler(req, res) {
  if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const chartsBaseUrl = process.env.CHARTS_EMBED_SDK_BASEURL;
  const dashboardIdGeneral = process.env.DASHBOARD_ID_GENERAL;
  const dashboardIdProduct = process.env.DASHBOARD_ID_PRODUCT;

  // Hardcoded default location ID
  const defaultLocationId = "65c63cb61526ffd3415fadbd";

  if (!chartsBaseUrl || !dashboardIdGeneral || !dashboardIdProduct) {
      return res.status(500).json({ error: 'Missing configuration in environment variables' });
  }

  res.status(200).json({
      analyticsInfo: {
          chartsBaseUrl,
          dashboardIdGeneral,
          dashboardIdProduct,
      },
      defaultLocationId, // Include default location in the response
  });
}
