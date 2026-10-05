export type TriggerDomain = 'GROUP_BUY' | 'FINANCE' | 'HELPDESK' | 'VISITOR_SECURITY' | 'SMART_METER' | 'PARKING';
export type TriggerEventType =
  | 'GROUP_BUY_THRESHOLD'
  | 'MAINTENANCE_OVERDUE'
  | 'TICKET_SLA_THRESHOLD'
  | 'VISITOR_ENTRY'
  | 'VISITOR_OVERSTAY'
  | 'METER_ABNORMAL_SPIKE'
  | 'EV_CHARGER_IDLE';

export type ActionType =
  | 'SEND_PUSH_NOTIFICATION'
  | 'SEND_WHATSAPP_REMINDER'
  | 'CREATE_HELPDESK_TICKET'
  | 'NOTIFY_SECURITY_DESK'
  | 'APPLY_LEDGER_SURCHARGE'
  | 'FLAG_ANPR_GATE';

export type ComparisonOperator = 'GTE' | 'LTE' | 'EQ' | 'GT' | 'LT' | 'EQUALS_BOOLEAN';

export interface DelayedActionConfig {
  hasDelay: boolean;
  delayValue: number;
  delayUnit: 'MINUTES' | 'HOURS' | 'DAYS';
  recheckConditionKey?: string;
  recheckOperator?: ComparisonOperator;
  recheckThresholdValue?: any;
  recheckDescription?: string;
}

export interface AutomationRuleDto {
  id: string;
  name: string;
  description: string;
  domain: TriggerDomain;
  eventType: TriggerEventType;
  conditionKey: string;
  operator: ComparisonOperator;
  thresholdValue: string | number | boolean;
  actionType: ActionType;
  actionPayload: Record<string, any>;
  delayConfig?: DelayedActionConfig;
  isActive: boolean;
  totalExecutions: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface PendingDelayedTaskDto {
  id: string;
  ruleId: string;
  ruleName: string;
  domain: TriggerDomain;
  scheduledAt: string;
  triggerTargetAt: string;
  remainingFormatted: string;
  initialPayload: Record<string, any>;
  recheckConditionKey?: string;
  recheckExpectedValue?: any;
  status: 'SCHEDULED' | 'EXECUTED' | 'CANCELLED_EARLY';
  cancellationReason?: string;
}

export interface AutomationPresetDto {
  id: string;
  name: string;
  description: string;
  domain: TriggerDomain;
  eventType: TriggerEventType;
  conditionKey: string;
  operator: ComparisonOperator;
  thresholdValue: string | number | boolean;
  actionType: ActionType;
  actionPayload: Record<string, any>;
  delayConfig?: DelayedActionConfig;
  popularBadge?: boolean;
}

export interface AutomationExecutionLogDto {
  id: string;
  ruleId: string;
  ruleName: string;
  domain: TriggerDomain;
  eventType: TriggerEventType;
  triggeredAt: string;
  eventPayload: Record<string, any>;
  evaluationResult: 'TRIGGERED' | 'SKIPPED' | 'FAILED' | 'CANCELLED_EARLY';
  actionTaken: string;
  targetRecipients?: string;
  latencyMs: number;
  delayNote?: string;
}

export interface CreateRuleRequest {
  name: string;
  description: string;
  domain: TriggerDomain;
  eventType: TriggerEventType;
  conditionKey: string;
  operator: ComparisonOperator;
  thresholdValue: string | number | boolean;
  actionType: ActionType;
  actionPayload: Record<string, any>;
  delayConfig?: DelayedActionConfig;
}

export interface AutomationMetricsDto {
  activeRulesCount: number;
  totalExecutionsMonth: number;
  pendingDelayedTasksCount: number;
  successRatePercentage: number;
  hoursSavedEstimated: number;
}

export interface AiRuleParseResponse {
  success: boolean;
  confidence: number;
  parsedRule: {
    name: string;
    domain: TriggerDomain;
    eventType: TriggerEventType;
    conditionKey: string;
    operator: ComparisonOperator;
    thresholdValue: string | number | boolean;
    actionType: ActionType;
    actionPayload: Record<string, any>;
    delayConfig?: DelayedActionConfig;
  };
  explanation: string;
}