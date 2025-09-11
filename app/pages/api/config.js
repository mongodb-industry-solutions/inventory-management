import retail from "../../config/retail";
import manufacturing from "../../config/manufacturing";
import {
  resolveIndustryFromRequest,
  getIndustryConfig,
} from "../../lib/industryConfig";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const industry = resolveIndustryFromRequest(req);

  // Merge file config with env overrides if provided
  const fileConfig = industry === "manufacturing" ? manufacturing : retail;
  const merged = {
    chartsBaseUrl:
      process.env.CHARTS_EMBED_SDK_BASEURL || fileConfig.chartsBaseUrl,
    dashboardIdGeneral:
      process.env.DASHBOARD_ID_GENERAL || fileConfig.dashboardIdGeneral,
    dashboardIdProduct:
      process.env.DASHBOARD_ID_PRODUCT || fileConfig.dashboardIdProduct,
  };

  if (
    !merged.chartsBaseUrl ||
    !merged.dashboardIdGeneral ||
    !merged.dashboardIdProduct
  ) {
    return res
      .status(500)
      .json({
        error:
          "Missing configuration for charts. Configure in app/config/*.js or env.",
      });
  }

  // Hardcoded default location ID (unchanged)
  const defaultLocationId = "65c63cb61526ffd3415fadbd";

  res.status(200).json({
    analyticsInfo: merged,
    defaultLocationId,
    industry,
  });
}
