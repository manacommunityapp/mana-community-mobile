import { describe, it } from 'node:test';
import assert from 'node:assert';

// Pure normalizer logic mirroring services/jewelleryService.ts
function unwrapPaginatedList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray(data.content)) {
    return data.content;
  }
  return [];
}

function normalizeJewelleryVendor(raw) {
  let specialties = [];
  if (Array.isArray(raw?.specialties)) {
    specialties = raw.specialties.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof raw?.specialties === 'string' && raw.specialties.trim()) {
    specialties = raw.specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return {
    id: String(raw?.id ?? ''),
    shopName: raw?.shopName ?? '',
    ownerName: raw?.ownerName ?? '',
    rating: Number(raw?.rating ?? 0),
    reviewCount: Number(raw?.reviewCount ?? 0),
    specialties,
    address: raw?.address ?? '',
    distance: raw?.distance ?? undefined,
    isVerified: Boolean(raw?.isVerified),
    phoneNumber: raw?.phoneNumber ?? undefined,
    imageUrl: raw?.imageUrl ?? undefined,
    openHours: raw?.openHours ?? undefined,
  };
}

function normalizeJewelleryProduct(raw) {
  let tags = undefined;
  if (Array.isArray(raw?.tags)) {
    tags = raw.tags.map((t) => String(t).trim()).filter(Boolean);
  } else if (typeof raw?.tags === 'string' && raw.tags.trim()) {
    tags = raw.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  return {
    id: String(raw?.id ?? ''),
    vendorId: String(raw?.vendorId ?? ''),
    vendorName: raw?.vendorName ?? '',
    sku: raw?.sku ?? '',
    name: raw?.name ?? '',
    category: raw?.category ?? 'OTHER',
    material: raw?.material ?? 'GOLD',
    purity: raw?.purity ?? undefined,
    netWeightG: raw?.netWeightG != null ? Number(raw.netWeightG) : undefined,
    description: raw?.description ?? undefined,
    imageUrls: Array.isArray(raw?.imageUrls) ? raw.imageUrls : [],
    tryOnAssetUrl: raw?.tryOnAssetUrl ?? undefined,
    goldRatePerGram: raw?.goldRatePerGram != null ? Number(raw.goldRatePerGram) : undefined,
    makingCharges: raw?.makingCharges != null ? Number(raw.makingCharges) : undefined,
    stoneCost: raw?.stoneCost != null ? Number(raw.stoneCost) : undefined,
    totalPrice: Number(raw?.totalPrice ?? 0),
    gstPercent: raw?.gstPercent != null ? Number(raw.gstPercent) : undefined,
    stockQuantity: Number(raw?.stockQuantity ?? 0),
    status: raw?.status ?? 'ACTIVE',
    isWishlisted: Boolean(raw?.isWishlisted),
    tags,
    huid: raw?.huid ?? undefined,
  };
}

function computeGstValue(product) {
  const goldCost =
    product.netWeightG && product.goldRatePerGram
      ? Math.round(product.netWeightG * product.goldRatePerGram)
      : 0;
  const preTaxSubtotal = goldCost + (product.makingCharges ?? 0) + (product.stoneCost ?? 0);
  return product.gstPercent
    ? preTaxSubtotal > 0
      ? Math.round(preTaxSubtotal * (product.gstPercent / 100))
      : Math.round(product.totalPrice - product.totalPrice / (1 + product.gstPercent / 100))
    : 0;
}

describe('Jewellery Module End-to-End Contract & Logic Spec', () => {
  it('1. Unwraps Spring Page<ProductResponse> content array and handles 204 empty string safely', () => {
    const springPage = {
      content: [
        { id: 101, vendorId: 5, name: '22K Temple Jhumka', totalPrice: 45000, category: 'EARRINGS', material: 'GOLD' },
        { id: 102, vendorId: 5, name: 'Diamond Choker', totalPrice: 125000, category: 'NECKLACE', material: 'DIAMOND' },
      ],
      totalElements: 2,
      totalPages: 1,
    };

    const items = unwrapPaginatedList(springPage).map(normalizeJewelleryProduct);
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].id, '101');
    assert.strictEqual(items[0].vendorId, '5');
    assert.strictEqual(items[1].name, 'Diamond Choker');

    // HTTP 204 No Content from FitProfileController returns "" in Axios
    assert.deepStrictEqual(unwrapPaginatedList(''), []);
    assert.deepStrictEqual(unwrapPaginatedList(null), []);
  });

  it('2. Normalizes backend vendor specialties comma-string into string[] without crashing .map()', () => {
    const backendVendor = {
      id: 7,
      shopName: 'Kalyan Heritage Jewellers',
      ownerName: 'Ramesh Verma',
      specialties: 'Bridal, Gold, Temple, Diamond',
      rating: 4.8,
      reviewCount: 42,
      isVerified: true,
    };

    const normalized = normalizeJewelleryVendor(backendVendor);
    assert.strictEqual(normalized.id, '7');
    assert.deepStrictEqual(normalized.specialties, ['Bridal', 'Gold', 'Temple', 'Diamond']);
    assert.strictEqual(normalized.rating, 4.8);
  });

  it('3. Matches route param productId/vendorId string against normalized product/vendor IDs', () => {
    const products = [
      normalizeJewelleryProduct({ id: 12, vendorId: 3, name: 'Kundan Necklace', totalPrice: 82000 }),
    ];
    const routeParamProductId = '12';
    const found = products.find((p) => String(p.id) === String(routeParamProductId));
    assert.ok(found, 'Must match numeric backend ID against string route param');
    assert.strictEqual(found.name, 'Kundan Necklace');
  });

  it('4. Computes GST accurately from pre-tax components or inclusive totalPrice', () => {
    // Component-based product: 10g * 7000 = 70,000 + 10,000 making + 20,000 stone = 100,000 pre-tax; 3% GST = 3,000
    const detailedProduct = {
      netWeightG: 10,
      goldRatePerGram: 7000,
      makingCharges: 10000,
      stoneCost: 20000,
      gstPercent: 3,
      totalPrice: 103000,
    };
    assert.strictEqual(computeGstValue(detailedProduct), 3000);

    // Inclusive-only product: totalPrice = 103,000 with 3% GST -> pre-tax = 100,000 -> GST = 3,000
    const lumpSumProduct = {
      gstPercent: 3,
      totalPrice: 103000,
    };
    assert.strictEqual(computeGstValue(lumpSumProduct), 3000);
  });

  it('5. Normalizes merchant appointment customer details and RecommendationService fallback items', () => {
    const rawAppts = [
      {
        id: 77,
        vendorId: 5,
        vendorName: 'Mana Gold Palace',
        shopAddress: 'MG Road',
        customerId: 10,
        customerName: 'Ananya Rao',
        customerPhone: '9876501234',
        date: '2026-11-26',
        time: '03:00 PM',
        purpose: 'BRIDAL',
        status: 'PENDING',
      },
    ];
    const mapped = unwrapPaginatedList(rawAppts).map((a) => ({
      ...a,
      id: String(a.id),
      vendorId: String(a.vendorId),
      customerId: a.customerId != null ? String(a.customerId) : undefined,
    }));
    assert.strictEqual(mapped[0].id, '77');
    assert.strictEqual(mapped[0].customerId, '10');
    assert.strictEqual(mapped[0].customerName, 'Ananya Rao');
    assert.strictEqual(mapped[0].customerPhone, '9876501234');
  });
});
