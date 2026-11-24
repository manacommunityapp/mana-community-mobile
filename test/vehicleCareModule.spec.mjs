import { describe, it } from 'node:test';
import assert from 'node:assert';

// ── Pure helper logic mirroring services/vehicleCareService.ts ────────────────

const EMOJI_BY_NAME = [
  ['exterior wash', '💧'],
  ['full', '🚿'],
  ['interior deep', '✨'],
  ['premium', '💎'],
  ['steam', '♨️'],
  ['interior only', '🪑'],
];

const EMOJI_BY_TYPE = {
  CAR: '🚗', BIKE: '🛵', SUV: '🚙', TRUCK: '🚐',
};

function extractList(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.content)) return d.content;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(res?.content)) return res.content;
  return [];
}

function mapAddon(raw) {
  return {
    id: String(raw?.id ?? ''),
    name: raw?.name || '',
    description: raw?.description ?? raw?.name ?? '',
    price: Number(raw?.price || 0),
    durationMins: raw?.durationMinutes ?? raw?.durationMins ?? 0,
  };
}

function mapCatalogItem(raw) {
  const lc = (raw?.name ?? '').toLowerCase();
  const emoji = raw?.emoji || EMOJI_BY_NAME.find(([k]) => lc.includes(k))?.[1] || (raw?.name?.includes('Full') ? '🚿' : '💧');
  return {
    id: String(raw?.id ?? ''),
    serviceType: raw?.serviceType ?? raw?.name?.toUpperCase().replace(/\s+/g, '_') ?? 'FULL_WASH',
    name: raw?.name || 'Vehicle Service',
    description: raw?.description ?? '',
    emoji,
    basePrice: Number(raw?.basePrice || 0),
    communityPrice: Number(raw?.communityPrice ?? raw?.basePrice ?? 0),
    durationMins: raw?.durationMinutes ?? raw?.durationMins ?? 30,
    vehicleTypes: raw?.vehicleTypes ?? ['CAR', 'SUV', 'BIKE'],
    addons: (raw?.addons ?? []).map(mapAddon),
    popular: Boolean(raw?.isPopular ?? raw?.popular ?? false),
    gradientColors: [raw?.gradientStart ?? '#4F46E5', raw?.gradientEnd ?? '#6366F1'],
  };
}

function mapVehicle(raw) {
  const type = raw?.vehicleType ?? raw?.type ?? 'CAR';
  return {
    id: String(raw?.id ?? ''),
    nickname: raw?.nickname || 'My Vehicle',
    type,
    make: raw?.make || '',
    model: raw?.model || '',
    color: raw?.color ?? '',
    plateNumber: raw?.plateNumber || '',
    isDefault: Boolean(raw?.isDefault ?? raw?.default ?? raw?.setAsDefault),
    imageEmoji: EMOJI_BY_TYPE[type] ?? (type === 'BIKE' ? '🛵' : '🚗'),
  };
}

function mapSlot(raw) {
  const available = raw?.available ?? (raw?.bookedCount !== undefined && raw?.totalCapacity !== undefined ? raw.bookedCount < raw.totalCapacity : true);
  const remaining = raw?.remaining ?? Math.max(0, (raw?.totalCapacity ?? 1) - (raw?.bookedCount ?? 0));
  return {
    id: String(raw?.id ?? ''),
    date: raw?.slotDate ?? raw?.date ?? '',
    startTime: raw?.startTime ? (raw.startTime.length > 5 ? raw.startTime.substring(0, 5) : raw.startTime) : '09:00',
    endTime: raw?.endTime ? (raw.endTime.length > 5 ? raw.endTime.substring(0, 5) : raw.endTime) : '10:00',
    available: Boolean(available),
    remaining: Number(remaining),
  };
}

function mapBooking(b) {
  const addonNames = b?.addonNames || (b?.addons || []).map((a) => a.name) || [];
  const serviceEmoji = b?.serviceEmoji || (b?.serviceName?.includes('Full') ? '🚿' : '💧');
  return {
    id: String(b?.id ?? ''),
    bookingNumber: b?.bookingNumber || `VC-${b?.id}`,
    vehicleId: String(b?.vehicleId || ''),
    vehicleDisplay: b?.vehicleDisplay || `${b?.vehicleNickname || 'Vehicle'} • ${b?.vehiclePlate || ''}`,
    serviceId: String(b?.serviceId || ''),
    serviceName: b?.serviceName || 'Vehicle Service',
    serviceEmoji,
    addonIds: b?.addonIds || (b?.addons || []).map((a) => String(a.id)),
    addonNames,
    date: b?.date || b?.scheduledDate || '',
    startTime: b?.startTime ? (b.startTime.length > 5 ? b.startTime.substring(0, 5) : b.startTime) : '09:00',
    endTime: b?.endTime ? (b.endTime.length > 5 ? b.endTime.substring(0, 5) : b.endTime) : '10:00',
    location: b?.location || b?.locationNotes || '',
    status: b?.status || 'CONFIRMED',
    quotedPrice: Number(b?.quotedPrice ?? b?.totalAmount ?? 0),
    paidAmount: Number(b?.paidAmount ?? b?.totalAmount ?? 0),
    technicianName: b?.technicianName,
    technicianPhone: b?.technicianPhone,
    eta: b?.etaMinutes ? `${b.etaMinutes} mins` : b?.eta,
    rating: b?.rating,
    reviewText: b?.reviewText,
    canCancel: b?.canCancel ?? ['PENDING_PAYMENT', 'CONFIRMED', 'ASSIGNED'].includes(b?.status),
    canRate: b?.canRate ?? (b?.status === 'COMPLETED' && !b?.rating),
    createdAt: b?.createdAt || '',
  };
}

function formatPlanFrequencyLabel(creditsPerCycle, frequency) {
  const unit = frequency === 'WEEKLY' ? 'week' : 'month';
  return `${creditsPerCycle} washes/${unit} • ${frequency.toLowerCase()}`;
}

describe('Vehicle Care (Washcaro) Module Test Suite', () => {
  describe('1. Response Payload Unwrapping (extractList)', () => {
    it('unwraps direct array responses', () => {
      const res = { data: [{ id: 1, name: 'Exterior Wash' }, { id: 2, name: 'Full Wash' }] };
      const list = extractList(res);
      assert.strictEqual(list.length, 2);
      assert.strictEqual(list[0].id, 1);
    });

    it('unwraps Spring Data Page responses ({ content: [...] })', () => {
      const res = {
        data: {
          content: [{ id: 10, nickname: 'Civic' }, { id: 11, nickname: 'Creta' }],
          totalElements: 2,
          totalPages: 1,
          size: 20,
        },
      };
      const list = extractList(res);
      assert.strictEqual(list.length, 2);
      assert.strictEqual(list[1].nickname, 'Creta');
    });

    it('unwraps standard API envelope ({ data: [...] })', () => {
      const res = {
        data: {
          data: [{ id: 101, status: 'CONFIRMED' }],
        },
      };
      const list = extractList(res);
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0].id, 101);
    });

    it('returns empty array safely when response is null, undefined, or empty', () => {
      assert.deepStrictEqual(extractList(null), []);
      assert.deepStrictEqual(extractList(undefined), []);
      assert.deepStrictEqual(extractList({ data: null }), []);
      assert.deepStrictEqual(extractList({ data: {} }), []);
    });
  });

  describe('2. Catalog Item Mapping & DTO Normalization', () => {
    it('normalizes backend field durationMinutes to durationMins and isPopular to popular', () => {
      const raw = {
        id: 5,
        name: 'Full Body Foam Wash',
        basePrice: 400,
        communityPrice: 349,
        durationMinutes: 45,
        isPopular: true,
        gradientStart: '#1E1B4B',
        gradientEnd: '#4338CA',
      };
      const item = mapCatalogItem(raw);
      assert.strictEqual(item.id, '5');
      assert.strictEqual(item.durationMins, 45);
      assert.strictEqual(item.popular, true);
      assert.strictEqual(item.emoji, '🚿');
      assert.deepStrictEqual(item.gradientColors, ['#1E1B4B', '#4338CA']);
    });

    it('derives contextual emoji based on service name', () => {
      assert.strictEqual(mapCatalogItem({ name: 'Exterior Wash' }).emoji, '💧');
      assert.strictEqual(mapCatalogItem({ name: 'Full Car Spa' }).emoji, '🚿');
      assert.strictEqual(mapCatalogItem({ name: 'Interior Deep Clean' }).emoji, '✨');
      assert.strictEqual(mapCatalogItem({ name: 'Premium Ceramic Polish' }).emoji, '💎');
      assert.strictEqual(mapCatalogItem({ name: 'Steam Sterilization' }).emoji, '♨️');
    });

    it('maps addons properly with durationMinutes normalization', () => {
      const raw = {
        id: 1,
        name: 'Basic Wash',
        addons: [
          { id: 101, name: 'Tyre Dressing', price: 50, durationMinutes: 10 },
          { id: 102, name: 'Windshield Coating', price: 100, durationMins: 15 },
        ],
      };
      const item = mapCatalogItem(raw);
      assert.strictEqual(item.addons.length, 2);
      assert.strictEqual(item.addons[0].durationMins, 10);
      assert.strictEqual(item.addons[1].durationMins, 15);
    });
  });

  describe('3. Vehicle Profile Normalization', () => {
    it('normalizes backend vehicleType to type and sets correct emoji icon', () => {
      const bike = mapVehicle({
        id: 1,
        nickname: 'My Scooter',
        vehicleType: 'BIKE',
        make: 'Honda',
        model: 'Activa',
        plateNumber: 'KA 01 AB 1234',
        isDefault: true,
      });
      assert.strictEqual(bike.type, 'BIKE');
      assert.strictEqual(bike.imageEmoji, '🛵');
      assert.strictEqual(bike.isDefault, true);

      const suv = mapVehicle({
        id: 2,
        nickname: 'Family Car',
        type: 'SUV',
        make: 'Mahindra',
        model: 'XUV700',
        default: false,
      });
      assert.strictEqual(suv.type, 'SUV');
      assert.strictEqual(suv.imageEmoji, '🚙');
      assert.strictEqual(suv.isDefault, false);
    });
  });

  describe('4. TimeSlot Mapping & Capacity Calculation', () => {
    it('maps slotDate to date and calculates remaining capacity from total and booked', () => {
      const raw = {
        id: 501,
        slotDate: '2026-11-25',
        startTime: '10:00:00',
        endTime: '11:00:00',
        totalCapacity: 5,
        bookedCount: 3,
      };
      const slot = mapSlot(raw);
      assert.strictEqual(slot.date, '2026-11-25');
      assert.strictEqual(slot.startTime, '10:00');
      assert.strictEqual(slot.endTime, '11:00');
      assert.strictEqual(slot.remaining, 2);
      assert.strictEqual(slot.available, true);
    });

    it('marks slot unavailable when bookedCount equals or exceeds totalCapacity', () => {
      const raw = {
        id: 502,
        date: '2026-11-25',
        totalCapacity: 4,
        bookedCount: 4,
      };
      const slot = mapSlot(raw);
      assert.strictEqual(slot.remaining, 0);
      assert.strictEqual(slot.available, false);
    });
  });

  describe('5. Booking Normalization & Lifecycle Rules', () => {
    it('allows cancellation for PENDING_PAYMENT, CONFIRMED, ASSIGNED statuses', () => {
      assert.strictEqual(mapBooking({ status: 'PENDING_PAYMENT' }).canCancel, true);
      assert.strictEqual(mapBooking({ status: 'CONFIRMED' }).canCancel, true);
      assert.strictEqual(mapBooking({ status: 'ASSIGNED' }).canCancel, true);
      assert.strictEqual(mapBooking({ status: 'IN_PROGRESS' }).canCancel, false);
      assert.strictEqual(mapBooking({ status: 'COMPLETED' }).canCancel, false);
      assert.strictEqual(mapBooking({ status: 'CANCELLED' }).canCancel, false);
    });

    it('enables rating only when status is COMPLETED and no existing rating exists', () => {
      assert.strictEqual(mapBooking({ status: 'COMPLETED', rating: null }).canRate, true);
      assert.strictEqual(mapBooking({ status: 'COMPLETED', rating: 5 }).canRate, false);
      assert.strictEqual(mapBooking({ status: 'CONFIRMED', rating: null }).canRate, false);
    });

    it('formats totalAmount fallback into quotedPrice and paidAmount', () => {
      const raw = {
        id: 88,
        totalAmount: 499,
        status: 'CONFIRMED',
      };
      const booking = mapBooking(raw);
      assert.strictEqual(booking.quotedPrice, 499);
      assert.strictEqual(booking.paidAmount, 499);
      assert.strictEqual(booking.bookingNumber, 'VC-88');
    });
  });

  describe('6. Plan Frequency UX Normalization', () => {
    it('formats frequency labels correctly for both WEEKLY and MONTHLY cycles', () => {
      const weekly = formatPlanFrequencyLabel(4, 'WEEKLY');
      assert.strictEqual(weekly, '4 washes/week • weekly');

      const monthly = formatPlanFrequencyLabel(4, 'MONTHLY');
      assert.strictEqual(monthly, '4 washes/month • monthly');
    });
  });
});
