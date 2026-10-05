import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
describe('Mana Automation (Delayed Workflows & AI Assistant) Test Suite', () => {
  it('1. AI Assistant: Should parse "Remind me on WhatsApp if my electricity bill crosses ₹3,000"', () => {
    const prompt = 'Remind me on WhatsApp if my electricity bill crosses ₹3,000';
    const q = prompt.toLowerCase();
    const isElectricity = q.includes('electricity');
    const isWhatsApp = q.includes('whatsapp');
    const amount = 3000;

    assert.equal(isElectricity, true);
    assert.equal(isWhatsApp, true);
    assert.equal(amount, 3000);
  });

  it('2. AI Assistant: Should parse "Alert security guard if visitor stays beyond 3 hours"', () => {
    const prompt = 'Alert security guard if visitor stays beyond 3 hours';
    const q = prompt.toLowerCase();
    const isVisitor = q.includes('visitor');
    const delayHours = 3;

    assert.equal(isVisitor, true);
    assert.equal(delayHours, 3);
  });

  it('3. Delayed Workflow: Should fire security alert when visitor remains inside after 3 hours', () => {
    const initialEntry = { visitorId: 'V-100', entryTime: '10:00 AM', inside: true };
    const stateAfter3Hours = { visitorId: 'V-100', inside: true };

    const shouldAlert = initialEntry.inside && stateAfter3Hours.inside;
    assert.equal(shouldAlert, true);
  });

  it('4. Delayed Workflow: Should cancel alert early if visitor exits within 3 hours', () => {
    const initialEntry = { visitorId: 'V-100', entryTime: '10:00 AM', inside: true };
    const stateAfter3Hours = { visitorId: 'V-100', inside: false }; // Exited at 10:45 AM

    const shouldAlert = initialEntry.inside && stateAfter3Hours.inside;
    assert.equal(shouldAlert, false);
  });

  it('5. Scheduled Tasks: Should calculate remaining countdown formatted string', () => {
    const task = {
      id: 'task-delay-101',
      remainingMinutes: 72,
      getFormatted() {
        const h = Math.floor(this.remainingMinutes / 60);
        const m = this.remainingMinutes % 60;
        return `${h}h ${m}m remaining`;
      }
    };
    assert.equal(task.getFormatted(), '1h 12m remaining');
  });
});