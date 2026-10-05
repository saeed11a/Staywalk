// Uppers are packed in bags — two standard sizes: 100-pair and 150-pair.
export const BAG_SIZES = [100, 150];

/** True when a loosely-typed pack type means a bag (e.g. "bag", "Bags"). */
export const isBag = (packType) => /^bags?$/i.test(String(packType || '').trim());
