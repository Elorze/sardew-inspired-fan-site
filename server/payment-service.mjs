const catalogEntries = {
  "merch-01": ["种种世界贴纸包", 1800],
  "merch-02": ["小伙伴异形贴纸组", 2200],
  "merch-03": ["蒲公英地图贴纸套装", 2600],
  "merch-04": ["种种精灵亚克力挂件", 3200],
  "merch-05": ["蓝花园和纸胶带", 1600],
  "merch-06": ["盆栽伙伴徽章组", 2800],
  "merch-07": ["春日花朵刺绣章", 2400],
  "merch-08": ["花园一角便签本", 1800],
  "merch-09": ["花园伙伴异形贴", 2000],
  "merch-10": ["种种世界纪念画片", 1500],
  "merch-11": ["种种酒馆纪念画片", 1500],
  "merch-12": ["蒲公英大世界纪念画片", 1500],
  "merch-13": ["窗边种种盆栽", 3600],
  "merch-14": ["浅蓝拼花地砖样片", 1200],
  "merch-15": ["小精灵手办模型", 6800],
  "merch-16": ["种种卡套", 2400],
  "merch-17": ["蓝铃花亚克力挂件", 3200],
  "merch-18": ["植物观察便签", 1800],
  "merch-19": ["蓝铃花刺绣章", 2400],
  "merch-20": ["小精灵贴纸页", 2000],
};

export const paymentCatalog = Object.freeze(
  Object.fromEntries(
    Object.entries(catalogEntries).map(([productId, [name, priceInCents]]) => [
      productId,
      Object.freeze({ name, priceInCents }),
    ]),
  ),
);

const normalizeText = (value, maximumLength) =>
  String(value || "").trim().replace(/\s+/g, " ").slice(0, maximumLength);

export const normalizePaymentCart = (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 20) {
    throw new Error("INVALID_CART");
  }

  const quantities = new Map();
  for (const rawItem of rawItems) {
    const productId = String(rawItem?.productId || "");
    const quantity = Number(rawItem?.quantity);
    if (
      !paymentCatalog[productId] ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      throw new Error("INVALID_CART");
    }
    const nextQuantity = (quantities.get(productId) || 0) + quantity;
    if (nextQuantity > 10) throw new Error("INVALID_CART");
    quantities.set(productId, nextQuantity);
  }

  return [...quantities].map(([productId, quantity]) => ({
    productId,
    quantity,
    name: paymentCatalog[productId].name,
    unitPriceInCents: paymentCatalog[productId].priceInCents,
  }));
};

export const normalizeDelivery = (rawDelivery) => {
  const recipientName = normalizeText(rawDelivery?.recipientName, 32);
  const phone = normalizeText(rawDelivery?.phone, 24);
  const address = normalizeText(rawDelivery?.address, 180);

  if (
    recipientName.length < 2 ||
    !/^[0-9+\-\s()]{7,24}$/.test(phone) ||
    address.length < 6
  ) {
    throw new Error("INVALID_DELIVERY");
  }

  return { recipientName, phone, address };
};

export const amountToCents = (value) => {
  const normalized = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [yuan, fraction = ""] = normalized.split(".");
  const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
};

export const isOrderAmountEqual = (order, alipayAmount) =>
  amountToCents(alipayAmount) ===
  (order.totalInCents ?? amountToCents(order.totalAmount));

export const mapAlipayTradeStatus = (tradeStatus) => {
  if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
    return "paid";
  }
  if (tradeStatus === "TRADE_CLOSED") return "closed";
  return "pending";
};
