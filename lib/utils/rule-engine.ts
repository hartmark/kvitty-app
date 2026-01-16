import type { ConditionType, ActionType } from "@/lib/validations/categorization-rules";

/**
 * Check if a regex pattern is potentially dangerous (ReDoS)
 * Returns true if the pattern appears safe
 */
function isSafeRegex(pattern: string): boolean {
  // Reject patterns that are too long
  if (pattern.length > 200) return false;

  // Check for common ReDoS patterns:
  // - Nested quantifiers like (a+)+ or (a*)*
  // - Overlapping alternations like (a|a)+
  const dangerousPatterns = [
    /\([^)]*[+*][^)]*\)[+*]/, // Nested quantifiers: (a+)+, (a*)*
    /\([^)]*[+*][^)]*\)\{/, // Nested quantifiers with braces: (a+){2,}
    /([+*?])\1/, // Repeated quantifiers: a++, a**
    /\(\?[^)]+\)[+*]/, // Non-capturing group with quantifier
  ];

  for (const dangerous of dangerousPatterns) {
    if (dangerous.test(pattern)) {
      return false;
    }
  }

  return true;
}

export interface CategorizationRule {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  conditionType: ConditionType;
  conditionValue: string;
  actionType: ActionType;
  actionValue: string;
}

export interface Transaction {
  description: string;
  amount: number;
}

export interface RuleMatch {
  rule: CategorizationRule;
  confidence: number; // 0-100
}

/**
 * Evaluate a condition against a transaction
 * Returns true if the condition matches
 */
export function evaluateCondition(
  conditionType: ConditionType,
  conditionValue: string,
  transaction: Transaction
): boolean {
  const description = transaction.description.toLowerCase();
  const value = conditionValue.toLowerCase();

  switch (conditionType) {
    case "contains":
      return description.includes(value);

    case "equals":
      return description === value;

    case "starts_with":
      return description.startsWith(value);

    case "ends_with":
      return description.endsWith(value);

    case "regex":
      try {
        // Check for potentially dangerous regex patterns (ReDoS)
        if (!isSafeRegex(conditionValue)) {
          return false;
        }
        const regex = new RegExp(conditionValue, "i");
        return regex.test(transaction.description);
      } catch {
        return false;
      }

    case "amount_gt": {
      const threshold = parseFloat(conditionValue);
      if (isNaN(threshold)) return false;
      return transaction.amount > threshold;
    }

    case "amount_lt": {
      const threshold = parseFloat(conditionValue);
      if (isNaN(threshold)) return false;
      return transaction.amount < threshold;
    }

    case "amount_range": {
      // Format: "min,max" e.g. "100,500"
      const parts = conditionValue.split(",").map((v) => parseFloat(v.trim()));
      const [min, max] = parts;
      if (isNaN(min) || isNaN(max)) return false;
      return transaction.amount >= min && transaction.amount <= max;
    }

    default:
      return false;
  }
}

/**
 * Calculate confidence score for a match
 * Higher priority rules get higher confidence
 * More specific matches (equals, regex) get higher confidence than partial matches
 */
function calculateConfidence(
  conditionType: ConditionType,
  priority: number,
  maxPriority: number
): number {
  // Base confidence from priority (40-100 based on priority)
  const priorityScore = maxPriority > 0
    ? 40 + (priority / maxPriority) * 60
    : 70;

  // Modifier based on condition specificity
  const specificityModifier: Record<ConditionType, number> = {
    equals: 1.0,
    regex: 0.95,
    starts_with: 0.85,
    ends_with: 0.85,
    contains: 0.75,
    amount_gt: 0.7,
    amount_lt: 0.7,
    amount_range: 0.8,
  };

  return Math.round(priorityScore * specificityModifier[conditionType]);
}

/**
 * Find all rules that match a transaction
 * Returns matches sorted by priority (highest first) and confidence
 */
export function findMatchingRules(
  rules: CategorizationRule[],
  transaction: Transaction
): RuleMatch[] {
  // Only consider active rules
  const activeRules = rules.filter((rule) => rule.isActive);

  if (activeRules.length === 0) {
    return [];
  }

  const maxPriority = Math.max(...activeRules.map((r) => r.priority));

  const matches: RuleMatch[] = [];

  for (const rule of activeRules) {
    if (evaluateCondition(rule.conditionType, rule.conditionValue, transaction)) {
      matches.push({
        rule,
        confidence: calculateConfidence(rule.conditionType, rule.priority, maxPriority),
      });
    }
  }

  // Sort by priority (descending), then by confidence (descending)
  return matches.sort((a, b) => {
    if (b.rule.priority !== a.rule.priority) {
      return b.rule.priority - a.rule.priority;
    }
    return b.confidence - a.confidence;
  });
}

/**
 * Get suggested templates from matching rules
 * Returns template IDs in order of priority
 */
export function getSuggestedTemplates(matches: RuleMatch[]): string[] {
  return matches
    .filter((m) => m.rule.actionType === "suggest_template")
    .map((m) => m.rule.actionValue);
}

/**
 * Get suggested accounts from matching rules
 * Returns account numbers in order of priority
 */
export function getSuggestedAccounts(matches: RuleMatch[]): number[] {
  return matches
    .filter((m) => m.rule.actionType === "suggest_account")
    .map((m) => parseInt(m.rule.actionValue, 10))
    .filter((n) => !isNaN(n));
}

/**
 * Check if any rule wants to auto-book
 * Returns the first auto-book rule match (highest priority)
 */
export function getAutoBookRule(matches: RuleMatch[]): RuleMatch | null {
  return matches.find((m) => m.rule.actionType === "auto_book") || null;
}
