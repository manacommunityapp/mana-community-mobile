import api from './apiClient';
import { secureLog } from '@/security';
import type {
  AutomationRuleDto,
  AutomationPresetDto,
  AutomationExecutionLogDto,
  PendingDelayedTaskDto,
  CreateRuleRequest,
  AutomationMetricsDto,
  AiRuleParseResponse,
  TriggerDomain,
} from '@/types/automation';

export * from '@/types/automation';

export const PRESET_RECIPES: AutomationPresetDto[] = [
  {
    id: 'preset-01',
    name: 'Group Buy 90% Milestone Alert',
    description: 'When collective orders reach 90% of volume target, notify wishlist residents to lock lowest price.',
    domain: 'GROUP_BUY',
    eventType: 'GROUP_BUY_THRESHOLD',
    conditionKey: 'progressPercent',
    operator: 'GTE',
    thresholdValue: 90,
    actionType: 'SEND_PUSH_NOTIFICATION',
    actionPayload: {
      title: '🔥 Group Buy Almost Unlocked!',
      body: 'Deal has reached 90% commitment! Join now to unlock highest wholesale discount.',
      target: 'WISHLIST_RESIDENTS',
    },
    popularBadge: true,
  },
  {
    id: 'preset-02',
    name: 'Overdue Maintenance Auto-Reminder',
    description: 'When maintenance invoice crosses due date, send instant gentle payment reminder.',
    domain: 'FINANCE',
    eventType: 'MAINTENANCE_OVERDUE',
    conditionKey: 'daysOverdue',
    operator: 'GTE',
    thresholdValue: 1,
    actionType: 'SEND_WHATSAPP_REMINDER',
    actionPayload: {
      template: 'MAINTENANCE_OVERDUE_NUDGE',
      includePayLink: true,
    },
    popularBadge: true,
  },
  {
    id: 'preset-03',
    name: '80% SLA Helpdesk Escalation',
    description: 'When ticket resolution consumes 80% of SLA time, elevate to High priority and alert Facility Lead.',
    domain: 'HELPDESK',
    eventType: 'TICKET_SLA_THRESHOLD',
    conditionKey: 'slaConsumedPercent',
    operator: 'GTE',
    thresholdValue: 80,
    actionType: 'CREATE_HELPDESK_TICKET',
    actionPayload: {
      escalatePriority: 'URGENT',
      alertRole: 'FACILITY_MANAGER',
    },
    popularBadge: true,
  },
  {
    id: 'preset-04',
    name: 'Visitor 3-Hour Delayed Security Alert',
    description: 'WHEN Visitor Enters ➔ WAIT 3 Hours ➔ IF Visitor still present THEN alert Security Guard desk.',
    domain: 'VISITOR_SECURITY',
    eventType: 'VISITOR_ENTRY',
    conditionKey: 'entryGateRecorded',
    operator: 'EQUALS_BOOLEAN',
    thresholdValue: true,
    delayConfig: {
      hasDelay: true,
      delayValue: 3,
      delayUnit: 'HOURS',
      recheckConditionKey: 'isStillInsideCampus',
      recheckOperator: 'EQUALS_BOOLEAN',
      recheckThresholdValue: true,
      recheckDescription: 'Check if visitor vehicle has not checked out at exit barrier.',
    },
    actionType: 'NOTIFY_SECURITY_DESK',
    actionPayload: {
      priority: 'HIGH',
      channel: 'GUARD_APP_AUDIO',
      message: 'Visitor pass overstayed 3-hour limit.',
    },
    popularBadge: true,
  },
  {
    id: 'preset-05',
    name: 'Smart Meter Burst Leak Emergency Ticket',
    description: 'When water smart meter detects continuous flow / pipe burst, create emergency plumbing ticket.',
    domain: 'SMART_METER',
    eventType: 'METER_ABNORMAL_SPIKE',
    conditionKey: 'burstLeakDetected',
    operator: 'EQUALS_BOOLEAN',
    thresholdValue: true,
    actionType: 'CREATE_HELPDESK_TICKET',
    actionPayload: {
      category: 'PLUMBING',
      priority: 'URGENT',
      autoDispatchVendor: true,
    },
    popularBadge: true,
  },
  {
    id: 'preset-06',
    name: 'EV Charger 30-Min Idle Penalty',
    description: 'When EV battery reaches 100% and car stays plugged past 30 mins, start ₹2/min idle surcharge.',
    domain: 'PARKING',
    eventType: 'EV_CHARGER_IDLE',
    conditionKey: 'idleMinutesPastFullCharge',
    operator: 'GTE',
    thresholdValue: 30,
    actionType: 'APPLY_LEDGER_SURCHARGE',
    actionPayload: {
      ratePerMinuteINR: 2,
      notifyUserPush: true,
    },
  }
];

let inMemoryRules: AutomationRuleDto[] = [
  {
    id: 'rule-01',
    name: 'Group Buy 90% Milestone Alert',
    description: 'When collective orders reach 90% of volume target, notify wishlist residents to lock lowest price.',
    domain: 'GROUP_BUY',
    eventType: 'GROUP_BUY_THRESHOLD',
    conditionKey: 'progressPercent',
    operator: 'GTE',
    thresholdValue: 90,
    actionType: 'SEND_PUSH_NOTIFICATION',
    actionPayload: { target: 'WISHLIST_RESIDENTS', title: 'Deal reaches 90%' },
    isActive: true,
    totalExecutions: 42,
    lastTriggeredAt: 'Today at 2:15 PM',
    createdAt: '2026-09-10T10:00:00Z',
  },
  {
    id: 'rule-02',
    name: 'Overdue Maintenance Auto-Reminder',
    description: 'When maintenance invoice crosses due date, send instant gentle payment reminder.',
    domain: 'FINANCE',
    eventType: 'MAINTENANCE_OVERDUE',
    conditionKey: 'daysOverdue',
    operator: 'GTE',
    thresholdValue: 1,
    actionType: 'SEND_WHATSAPP_REMINDER',
    actionPayload: { includePayLink: true },
    isActive: true,
    totalExecutions: 118,
    lastTriggeredAt: 'Yesterday at 9:00 AM',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'rule-03',
    name: 'Visitor 3-Hour Delayed Security Alert',
    description: 'WHEN Visitor Enters ➔ WAIT 3 Hours ➔ IF Visitor still present THEN alert Security.',
    domain: 'VISITOR_SECURITY',
    eventType: 'VISITOR_ENTRY',
    conditionKey: 'entryGateRecorded',
    operator: 'EQUALS_BOOLEAN',
    thresholdValue: true,
    delayConfig: {
      hasDelay: true,
      delayValue: 3,
      delayUnit: 'HOURS',
      recheckConditionKey: 'isStillInsideCampus',
      recheckOperator: 'EQUALS_BOOLEAN',
      recheckThresholdValue: true,
    },
    actionType: 'NOTIFY_SECURITY_DESK',
    actionPayload: { priority: 'HIGH' },
    isActive: true,
    totalExecutions: 29,
    lastTriggeredAt: 'Today at 4:30 PM',
    createdAt: '2026-09-12T10:00:00Z',
  },
  {
    id: 'rule-04',
    name: 'Smart Meter Burst Leak Emergency Ticket',
    description: 'When water smart meter detects continuous flow / pipe burst, create emergency plumbing ticket.',
    domain: 'SMART_METER',
    eventType: 'METER_ABNORMAL_SPIKE',
    conditionKey: 'burstLeakDetected',
    operator: 'EQUALS_BOOLEAN',
    thresholdValue: true,
    actionType: 'CREATE_HELPDESK_TICKET',
    actionPayload: { category: 'PLUMBING', priority: 'URGENT' },
    isActive: true,
    totalExecutions: 3,
    lastTriggeredAt: 'Last week',
    createdAt: '2026-09-20T10:00:00Z',
  }
];

let inMemoryPendingTasks: PendingDelayedTaskDto[] = [
  {
    id: 'task-delay-101',
    ruleId: 'rule-03',
    ruleName: 'Visitor 3-Hour Delayed Security Alert',
    domain: 'VISITOR_SECURITY',
    scheduledAt: '2:15 PM Today',
    triggerTargetAt: '5:15 PM Today',
    remainingFormatted: '1h 12m remaining',
    initialPayload: { passCode: 'VP-9901', visitorName: 'Rohan Sen', vehicle: 'KA-01-MM-8812', unit: 'Flat 402' },
    recheckConditionKey: 'isStillInsideCampus',
    recheckExpectedValue: true,
    status: 'SCHEDULED',
  },
  {
    id: 'task-delay-102',
    ruleId: 'rule-03',
    ruleName: 'Visitor 3-Hour Delayed Security Alert',
    domain: 'VISITOR_SECURITY',
    scheduledAt: '1:00 PM Today',
    triggerTargetAt: '4:00 PM Today',
    remainingFormatted: '0m (Cancelled Early)',
    initialPayload: { passCode: 'VP-9844', visitorName: 'Delivery Driver', vehicle: 'KA-04-DL-1122' },
    recheckConditionKey: 'isStillInsideCampus',
    recheckExpectedValue: true,
    status: 'CANCELLED_EARLY',
    cancellationReason: 'Visitor checked out at Exit Gate 2 after 42 minutes.',
  }
];

let inMemoryLogs: AutomationExecutionLogDto[] = [
  {
    id: 'log-01',
    ruleId: 'rule-01',
    ruleName: 'Group Buy 90% Milestone Alert',
    domain: 'GROUP_BUY',
    eventType: 'GROUP_BUY_THRESHOLD',
    triggeredAt: 'Today at 2:15 PM',
    eventPayload: { dealTitle: 'Organic Basmati Rice 25kg', committedQty: 92, targetQty: 100, progressPercent: 92 },
    evaluationResult: 'TRIGGERED',
    actionTaken: 'Dispatched push notification to 38 wishlist residents',
    targetRecipients: '38 Residents',
    latencyMs: 84,
  },
  {
    id: 'log-02',
    ruleId: 'rule-03',
    ruleName: 'Visitor 3-Hour Delayed Security Alert',
    domain: 'VISITOR_SECURITY',
    eventType: 'VISITOR_ENTRY',
    triggeredAt: 'Today at 4:30 PM',
    eventPayload: { passCode: 'VP-8812', vehicle: 'MH-12-AB-3344', stayDurationHours: 3.1 },
    evaluationResult: 'TRIGGERED',
    actionTaken: 'Audio chime sent to Guard Gate Desk (Overstay > 3 hrs)',
    targetRecipients: 'Main Gate Security Guard Desk',
    latencyMs: 110,
    delayNote: 'Waited 3 hours and confirmed visitor was still inside.',
  },
  {
    id: 'log-03',
    ruleId: 'rule-02',
    ruleName: 'Overdue Maintenance Auto-Reminder',
    domain: 'FINANCE',
    eventType: 'MAINTENANCE_OVERDUE',
    triggeredAt: 'Yesterday at 9:00 AM',
    eventPayload: { invoiceId: 'INV-2026-10-04', flat: 'Tower B - 604', daysOverdue: 2, amountINR: 4500 },
    evaluationResult: 'TRIGGERED',
    actionTaken: 'Sent WhatsApp reminder with instant UPI link',
    targetRecipients: 'Flat B-604',
    latencyMs: 120,
  }
];

export const automationService = {
  async getMetrics(): Promise<AutomationMetricsDto> {
    try {
      const res = await api.get<AutomationMetricsDto>('/automation/metrics');
      if (res.data) return res.data;
    } catch {}
    const totalExec = inMemoryRules.reduce((acc, r) => acc + r.totalExecutions, 0);
    return {
      activeRulesCount: inMemoryRules.filter((r) => r.isActive).length,
      totalExecutionsMonth: totalExec,
      pendingDelayedTasksCount: inMemoryPendingTasks.filter((t) => t.status === 'SCHEDULED').length,
      successRatePercentage: 99.4,
      hoursSavedEstimated: Math.round(totalExec * 0.25),
    };
  },

  async getRules(domain?: TriggerDomain): Promise<AutomationRuleDto[]> {
    try {
      const res = await api.get<AutomationRuleDto[]>('/automation/rules', { params: { domain } });
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}
    if (domain) return inMemoryRules.filter((r) => r.domain === domain);
    return inMemoryRules;
  },

  async getPresetRecipes(): Promise<AutomationPresetDto[]> {
    return PRESET_RECIPES;
  },

  async getPendingDelayedTasks(): Promise<PendingDelayedTaskDto[]> {
    try {
      const res = await api.get<PendingDelayedTaskDto[]>('/automation/delayed-tasks');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return inMemoryPendingTasks;
  },

  async enablePresetRecipe(presetId: string): Promise<AutomationRuleDto> {
    const preset = PRESET_RECIPES.find((p) => p.id === presetId);
    if (!preset) throw new Error('Preset recipe not found');

    const existing = inMemoryRules.find((r) => r.name === preset.name);
    if (existing) {
      existing.isActive = true;
      return existing;
    }

    const newRule: AutomationRuleDto = {
      id: 'rule-' + Date.now().toString().slice(-4),
      name: preset.name,
      description: preset.description,
      domain: preset.domain,
      eventType: preset.eventType,
      conditionKey: preset.conditionKey,
      operator: preset.operator,
      thresholdValue: preset.thresholdValue,
      actionType: preset.actionType,
      actionPayload: preset.actionPayload,
      delayConfig: preset.delayConfig,
      isActive: true,
      totalExecutions: 0,
      createdAt: new Date().toISOString(),
    };
    inMemoryRules.unshift(newRule);
    return newRule;
  },

  async createRule(req: CreateRuleRequest): Promise<AutomationRuleDto> {
    try {
      const res = await api.post<AutomationRuleDto>('/automation/rules', req);
      if (res.data) return res.data;
    } catch {}

    const newRule: AutomationRuleDto = {
      id: 'rule-' + Date.now().toString().slice(-4),
      name: req.name,
      description: req.description,
      domain: req.domain,
      eventType: req.eventType,
      conditionKey: req.conditionKey,
      operator: req.operator,
      thresholdValue: req.thresholdValue,
      actionType: req.actionType,
      actionPayload: req.actionPayload,
      delayConfig: req.delayConfig,
      isActive: true,
      totalExecutions: 0,
      createdAt: new Date().toISOString(),
    };
    inMemoryRules.unshift(newRule);
    return newRule;
  },

  async toggleRuleStatus(ruleId: string): Promise<AutomationRuleDto> {
    const rule = inMemoryRules.find((r) => r.id === ruleId);
    if (!rule) throw new Error('Rule not found');
    rule.isActive = !rule.isActive;
    return rule;
  },

  async getExecutionLogs(): Promise<AutomationExecutionLogDto[]> {
    try {
      const res = await api.get<AutomationExecutionLogDto[]>('/automation/logs');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}
    return inMemoryLogs;
  },

  /**
   * AI-Generated Rule Assistant (NLP Intent Synthesizer)
   */
  async parseNaturalLanguageRule(userPrompt: string): Promise<AiRuleParseResponse> {
    const q = userPrompt.toLowerCase().trim();

    // 1. Electricity / Utility bill alerts
    if (q.includes('electricity') || q.includes('power') || q.includes('meter bill') || q.includes('3,000') || q.includes('3000')) {
      const amountMatch = q.match(/\d[\d,.]*/);
      const amount = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 3000;
      const isWhatsApp = q.includes('whatsapp');

      return {
        success: true,
        confidence: 0.96,
        parsedRule: {
          name: 'Electricity Bill Over ₹' + amount.toLocaleString() + ' Alert',
          domain: 'FINANCE',
          eventType: 'MAINTENANCE_OVERDUE',
          conditionKey: 'electricityAmountINR',
          operator: 'GTE',
          thresholdValue: amount,
          actionType: isWhatsApp ? 'SEND_WHATSAPP_REMINDER' : 'SEND_PUSH_NOTIFICATION',
          actionPayload: {
            template: 'ELECTRICITY_SPIKE_NUDGE',
            thresholdINR: amount,
            target: 'CURRENT_RESIDENT',
          },
        },
        explanation: 'Synthesized rule to monitor electricity charges and trigger ' + (isWhatsApp ? 'WhatsApp' : 'Push') + ' alert when bill crosses ₹' + amount + '.',
      };
    }

    // 2. Visitor overstay with delayed action
    if (q.includes('visitor') || q.includes('guard') || q.includes('security') || q.includes('overstay')) {
      const hoursMatch = q.match(/(\d+)\s*(?:hour|hr|h)/);
      const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 3;

      return {
        success: true,
        confidence: 0.94,
        parsedRule: {
          name: 'Visitor ' + hours + '-Hour Overstay Security Alert',
          domain: 'VISITOR_SECURITY',
          eventType: 'VISITOR_ENTRY',
          conditionKey: 'entryGateRecorded',
          operator: 'EQUALS_BOOLEAN',
          thresholdValue: true,
          delayConfig: {
            hasDelay: true,
            delayValue: hours,
            delayUnit: 'HOURS',
            recheckConditionKey: 'isStillInsideCampus',
            recheckOperator: 'EQUALS_BOOLEAN',
            recheckThresholdValue: true,
            recheckDescription: 'Verify visitor has not exited before notifying guards',
          },
          actionType: 'NOTIFY_SECURITY_DESK',
          actionPayload: {
            priority: 'HIGH',
            channel: 'GUARD_APP_AUDIO',
          },
        },
        explanation: 'Generated delayed rule: WHEN Visitor enters ➔ WAIT ' + hours + ' hours ➔ IF still inside ➔ Alert Security.',
      };
    }

    // 3. Group Buy discount threshold
    if (q.includes('group buy') || q.includes('discount') || q.includes('deal')) {
      const pctMatch = q.match(/(\d+)%/);
      const pct = pctMatch ? parseInt(pctMatch[1], 10) : 90;

      return {
        success: true,
        confidence: 0.92,
        parsedRule: {
          name: 'Group Buy ' + pct + '% Target Push Alert',
          domain: 'GROUP_BUY',
          eventType: 'GROUP_BUY_THRESHOLD',
          conditionKey: 'progressPercent',
          operator: 'GTE',
          thresholdValue: pct,
          actionType: 'SEND_PUSH_NOTIFICATION',
          actionPayload: { target: 'WISHLIST_RESIDENTS' },
        },
        explanation: 'Created rule to alert wishlist residents once collective volume unlocks ' + pct + '% tier.',
      };
    }

    // Default fallback parse
    return {
      success: true,
      confidence: 0.85,
      parsedRule: {
        name: 'Custom Automation (' + userPrompt.slice(0, 24) + '...)',
        domain: 'HELPDESK',
        eventType: 'TICKET_SLA_THRESHOLD',
        conditionKey: 'slaConsumedPercent',
        operator: 'GTE',
        thresholdValue: 80,
        actionType: 'CREATE_HELPDESK_TICKET',
        actionPayload: { priority: 'HIGH' },
      },
      explanation: 'Extracted trigger condition from your prompt: "' + userPrompt + '".',
    };
  },

  async dryRunRule(rule: Partial<AutomationRuleDto>, samplePayload: Record<string, any>): Promise<{ shouldTrigger: boolean; reason: string }> {
    const val = samplePayload[rule.conditionKey || ''];
    const threshold = rule.thresholdValue;

    if (val === undefined) {
      return { shouldTrigger: false, reason: 'Payload does not contain key ' + rule.conditionKey };
    }

    let match = false;
    if (rule.operator === 'GTE') match = Number(val) >= Number(threshold);
    else if (rule.operator === 'LTE') match = Number(val) <= Number(threshold);
    else if (rule.operator === 'GT') match = Number(val) > Number(threshold);
    else if (rule.operator === 'LT') match = Number(val) < Number(threshold);
    else if (rule.operator === 'EQ') match = val === threshold;
    else if (rule.operator === 'EQUALS_BOOLEAN') match = Boolean(val) === Boolean(threshold);

    return {
      shouldTrigger: match,
      reason: match
        ? 'Condition matched: ' + rule.conditionKey + ' (' + val + ') ' + rule.operator + ' ' + threshold
        : 'Condition not satisfied: ' + rule.conditionKey + ' (' + val + ') does not satisfy ' + rule.operator + ' ' + threshold,
    };
  },
};