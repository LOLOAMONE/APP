export type DashboardWidgetType = (typeof DASHBOARD_WIDGET_CATALOG)[number]["type"];

/** Catalogue des widgets disponibles — vit dans le code, pas en base (voir DashboardWidget). */
export const DASHBOARD_WIDGET_CATALOG = [
  { type: "TODAY_SUMMARY", label: "Résumé du jour" },
  { type: "KEY_NUMBERS", label: "Chiffres clés" },
  { type: "SHORTCUTS", label: "Raccourcis" },
] as const;
