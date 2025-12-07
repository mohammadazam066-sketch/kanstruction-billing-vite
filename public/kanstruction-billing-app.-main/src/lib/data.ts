
export const GST_RATES = [0, 5, 12, 18, 28];

export const PRODUCT_CATEGORIES = [
  "Cement",
  "Steel",
  "Hardware",
  "Plywood",
  "Electrical Items",
  "Paint",
  "Rice / Food grains",
  "Others",
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

interface Product {
  name: string;
  hsnCode: string;
}

export const PRODUCTS: Record<ProductCategory, Product[]> = {
  "Cement": [
    { name: "PPC", hsnCode: "252329" },
    { name: "OPC", hsnCode: "252329" },
  ],
  "Steel": [
    { name: "TMT Bars (Fe 500D)", hsnCode: "721420" },
    { name: "MS Rods", hsnCode: "721499" },
    { name: "Binding Wire", hsnCode: "721710" },
    { name: "Structural Steel", hsnCode: "721633" },
  ],
  "Hardware": [
    { name: "Nails (per kg)", hsnCode: "731700" },
    { name: "Hinges (pair)", hsnCode: "830210" },
    { name: "Screws (box)", hsnCode: "731815" },
    { name: "Locks", hsnCode: "830140" },
    { name: "Door Handles", hsnCode: "830241" },
  ],
  "Plywood": [
    { name: "GreenPly", hsnCode: "441239" },
    { name: "CenturyPly", hsnCode: "441239" },
    { name: "Marine Plywood (8x4)", hsnCode: "441231" },
    { name: "Commercial Plywood (8x4)", hsnCode: "441234" },
    { name: "Laminates (sheet)", hsnCode: "441299" },
  ],
  "Electrical Items": [
    { name: "Switches", hsnCode: "853650" },
    { name: "Wires (per meter)", hsnCode: "854411" },
    { name: "LED Bulbs", hsnCode: "853950" },
    { name: "Ceiling Fans", hsnCode: "841451" },
    { name: "MCB", hsnCode: "853620" },
  ],
  "Paint": [
    { name: "Asian Paints Royale (1L)", hsnCode: "320810" },
    { name: "Nerolac Impressions (1L)", hsnCode: "320810" },
    { name: "Primer (1L)", hsnCode: "320910" },
    { name: "Putty (1kg)", hsnCode: "321410" },
    { name: "Berger WeatherCoat (1L)", hsnCode: "320810" },
  ],
  "Rice / Food grains": [
    { name: "Sona Masoori (25kg)", hsnCode: "100630" },
    { name: "Basmati Rice (1kg)", hsnCode: "100630" },
    { name: "Kolam Rice (10kg)", hsnCode: "100630" },
    { name: "Toor Dal (1kg)", hsnCode: "071360" },
  ],
  "Others": [],
};

    