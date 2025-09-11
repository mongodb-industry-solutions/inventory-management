// Centralized runtime configuration per industry

const INDUSTRY_KEYS = ["retail", "manufacturing"];

const BASE_CONFIG = {
  retail: {
    mongodbDatabaseName: "inventory_management_demo",
    chartsBaseUrl: process.env.CHARTS_EMBED_SDK_BASEURL || "",
    dashboardIdProduct: process.env.DASHBOARD_ID_PRODUCT || "",
    dashboardIdGeneral: process.env.DASHBOARD_ID_GENERAL || "",
  },
  manufacturing: {
    mongodbDatabaseName: "inventory_management_demo",
    chartsBaseUrl: process.env.CHARTS_EMBED_SDK_BASEURL || "",
    dashboardIdProduct: process.env.DASHBOARD_ID_PRODUCT || "",
    dashboardIdGeneral: process.env.DASHBOARD_ID_GENERAL || "",
  },
};

export function normalizeIndustry(industry) {
  return INDUSTRY_KEYS.includes(industry) ? industry : "retail";
}

export function resolveIndustryFromRequest(req) {
  const q = req?.query?.industry;
  if (INDUSTRY_KEYS.includes(q)) return q;
  const ref = req?.headers?.referer || "";
  const m = ref.match(/\/(retail|manufacturing)(?:\/|\?|$)/);
  return m ? m[1] : "retail";
}

export function resolveIndustryFromUrl(resolvedUrl, query) {
  const q = query?.industry;
  if (INDUSTRY_KEYS.includes(q)) return q;
  const m = (resolvedUrl || "").match(/^\/(retail|manufacturing)(?:\/|\?|$)/);
  return m ? m[1] : "retail";
}

export function getIndustryConfig(industry) {
  const key = normalizeIndustry(industry);
  const cfg = BASE_CONFIG[key] || BASE_CONFIG.retail;
  return {
    ...cfg,
    industry: key,
  };
}
