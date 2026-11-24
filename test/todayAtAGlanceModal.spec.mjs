import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Today at a Glance - All Updates Modal Logic Spec', () => {
  const mockData = {
    eventsCount: 3,
    eventsTodayCount: 1,
    sportsCount: '4 Matches',
    sportsSummary: { liveCount: 1, todayCount: 2, tourneyCount: 1 },
    pollsCount: 2,
    ticketsCount: 1,
    duesCount: '1 Due',
    duesOverdueTotal: 1500,
    facilitiesCount: 'Available',
    noticesCount: 'New Circular',
  };

  function computeGlanceItems(data, enabledModules = []) {
    const isAllowed = (mod) => !enabledModules.length || enabledModules.includes(mod);
    const items = [];

    if (isAllowed('VISITORS')) {
      items.push({
        id: 'pass_qr',
        category: 'security',
        label: 'Digital Resident Pass',
        value: 'Instant QR',
        badge: 'GATE',
        isPass: true,
      });
      items.push({
        id: 'pass_guest',
        category: 'security',
        label: 'Pre-Approve Guest',
        value: 'Pass +',
        route: '/visitors?action=preapprove&type=GUEST',
      });
    }

    if (isAllowed('SPORTS')) {
      if (data.sportsSummary?.liveCount > 0) {
        items.push({
          id: 'sports_live',
          category: 'sports',
          label: 'Live Matches Underway',
          value: `${data.sportsSummary.liveCount} Live`,
          badge: 'LIVE',
          urgent: true,
          route: '/sports/matches',
        });
      }
      if (data.sportsSummary?.todayCount > 0) {
        items.push({
          id: 'sports_today',
          category: 'sports',
          label: "Today's Scheduled Games",
          value: `${data.sportsSummary.todayCount} Today`,
          badge: 'TODAY',
          route: '/sports/matches',
        });
      }
      items.push({
        id: 'sports_courts',
        category: 'sports',
        label: 'Court & Pitch Booking',
        value: 'Book Slot',
        route: '/sports/facility/my-bookings',
      });
    }

    if (isAllowed('EVENTS')) {
      if (data.eventsTodayCount > 0) {
        items.push({
          id: 'events_today',
          category: 'events',
          label: "Today's Community Events",
          value: `${data.eventsTodayCount} Today`,
          badge: 'TODAY',
          urgent: true,
          route: '/events',
        });
      }
      items.push({
        id: 'events_upcoming',
        category: 'events',
        label: 'Upcoming Society Events',
        value: `${data.eventsCount} Events`,
        route: '/events',
      });
    }

    if (isAllowed('FINANCE_MGMT')) {
      const hasOverdue = data.duesOverdueTotal > 0;
      items.push({
        id: 'dues_status',
        category: 'services',
        label: hasOverdue ? 'Overdue Maintenance Dues' : 'Society Maintenance Dues',
        value: hasOverdue ? `₹${data.duesOverdueTotal}` : 'Paid ✓',
        badge: hasOverdue ? 'DUE' : 'PAID',
        urgent: hasOverdue,
        route: '/tabs/pay',
      });
    }

    if (isAllowed('HELPDESK')) {
      items.push({
        id: 'tickets_status',
        category: 'services',
        label: 'Active Service Tickets',
        value: `${data.ticketsCount} Open`,
        badge: 'OPEN',
        urgent: true,
        route: '/helpdesk',
      });
    }

    if (isAllowed('POLLS')) {
      items.push({
        id: 'polls_active',
        category: 'events',
        label: 'Society Votes & Polls',
        value: `${data.pollsCount} Open`,
        badge: 'VOTE',
        urgent: true,
        route: '/polls',
      });
    }

    if (isAllowed('FACILITIES')) {
      items.push({
        id: 'facilities_status',
        category: 'services',
        label: 'Clubhouse Amenities',
        value: data.facilitiesCount,
        route: '/facilities',
      });
    }

    return items;
  }

  it('1. Compiles all available community items across modules', () => {
    const items = computeGlanceItems(mockData);
    assert(items.length >= 10, 'Must provide comprehensive options across all modules');
    assert(items.some((i) => i.id === 'pass_qr'), 'Must include digital pass QR');
    assert(items.some((i) => i.id === 'sports_live'), 'Must include live matches');
    assert(items.some((i) => i.id === 'dues_status'), 'Must include dues status');
    assert(items.some((i) => i.id === 'events_today'), 'Must include today events');
  });

  it('2. Category filtering isolates alerts and active items', () => {
    const items = computeGlanceItems(mockData);
    const alerts = items.filter((i) => i.urgent || ['LIVE', 'DUE', 'TODAY', 'OPEN', 'VOTE'].includes(i.badge));
    assert(alerts.length >= 5, 'Alerts tab should catch urgent items');
    assert(alerts.some((a) => a.badge === 'LIVE'));
    assert(alerts.some((a) => a.badge === 'DUE'));
    assert(alerts.some((a) => a.badge === 'TODAY'));
  });

  it('3. Respects community module gating permissions', () => {
    const restrictedItems = computeGlanceItems(mockData, ['SPORTS', 'EVENTS']);
    assert(restrictedItems.every((i) => ['sports', 'events'].includes(i.category)));
    assert.strictEqual(restrictedItems.some((i) => i.id === 'dues_status'), false);
    assert.strictEqual(restrictedItems.some((i) => i.id === 'pass_qr'), false);
  });

  it('4. Real-time search filters items by label or description', () => {
    const items = computeGlanceItems(mockData);
    const searchResult = items.filter((i) => i.label.toLowerCase().includes('court') || i.value.toString().toLowerCase().includes('court'));
    assert.strictEqual(searchResult.length, 1);
    assert.strictEqual(searchResult[0].id, 'sports_courts');
  });
});
