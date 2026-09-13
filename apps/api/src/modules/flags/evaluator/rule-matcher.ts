import { RuleOperator } from '@feature-os/types';

function parseSemver(v: string): [number, number, number] {
  const parts = v.replace(/^v/, '').split('.').map((p) => parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compareSemver(a: string, b: string): number {
  const [a1, a2, a3] = parseSemver(a);
  const [b1, b2, b3] = parseSemver(b);
  if (a1 !== b1) return a1 - b1;
  if (a2 !== b2) return a2 - b2;
  return a3 - b3;
}

export function matchRuleCondition(
  attributeValue: any,
  operator: RuleOperator,
  targetValues: any[],
): boolean {
  if (attributeValue === undefined || attributeValue === null) {
    return false;
  }

  const strAttr = String(attributeValue).toLowerCase();

  switch (operator) {
    case RuleOperator.EQUALS:
      return targetValues.some((tv) => String(tv).toLowerCase() === strAttr);

    case RuleOperator.NOT_EQUALS:
      return targetValues.every((tv) => String(tv).toLowerCase() !== strAttr);

    case RuleOperator.CONTAINS:
      return targetValues.some((tv) => strAttr.includes(String(tv).toLowerCase()));

    case RuleOperator.NOT_CONTAINS:
      return targetValues.every((tv) => !strAttr.includes(String(tv).toLowerCase()));

    case RuleOperator.IN_LIST:
      return targetValues.some((tv) => String(tv).toLowerCase() === strAttr);

    case RuleOperator.GREATER_THAN: {
      const numAttr = parseFloat(attributeValue);
      const targetNum = parseFloat(targetValues[0]);
      return !isNaN(numAttr) && !isNaN(targetNum) && numAttr > targetNum;
    }

    case RuleOperator.LESS_THAN: {
      const numAttr = parseFloat(attributeValue);
      const targetNum = parseFloat(targetValues[0]);
      return !isNaN(numAttr) && !isNaN(targetNum) && numAttr < targetNum;
    }

    case RuleOperator.SEMVER_GTE: {
      const targetSemver = String(targetValues[0]);
      return compareSemver(String(attributeValue), targetSemver) >= 0;
    }

    case RuleOperator.SEMVER_LTE: {
      const targetSemver = String(targetValues[0]);
      return compareSemver(String(attributeValue), targetSemver) <= 0;
    }

    case RuleOperator.MATCHES_REGEX: {
      try {
        const pattern = new RegExp(String(targetValues[0]), 'i');
        return pattern.test(String(attributeValue));
      } catch {
        return false;
      }
    }

    default:
      return false;
  }
}
