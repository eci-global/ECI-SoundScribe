# Weight Information Removal Update

**Date**: 2025-10-10
**Status**: ✅ Completed
**Related Feature**: Support Mode Scoring Toggle

---

## 🎯 Change Summary

When scores are disabled in support mode, the weight information (e.g., "Weight: 60% of overall ECI score") is now also hidden to fully remove metric-focused language.

### Visual Changes

#### Before (All Metrics Visible):
```
┌─────────────────────────────────────┐
│ 💚 Care for Customer                │
│ Weight: 60% of overall ECI score    │
│                         75% | 5Y/2N/1U │
└─────────────────────────────────────┘
```

#### After - Scores ON (Metrics Mode):
```
┌─────────────────────────────────────┐
│ 💚 Care for Customer                │
│ Weight: 60% of overall ECI score    │
│                         75% | 5Y/2N/1U │
└─────────────────────────────────────┘
```
✅ Weight shown with scores

#### After - Scores OFF (Coaching Mode):
```
┌─────────────────────────────────────┐
│ 💚 Care for Customer                │
│            [Strong Performance] │
└─────────────────────────────────────┘
```
✅ Weight hidden, no metrics language

---

## 📝 Code Changes

### 1. ECICoachingInsights.tsx
**File**: `src/components/coach/ECICoachingInsights.tsx`
**Line**: 523-525

**Change**: Made weight text conditional on `showScores`

```tsx
// BEFORE:
<div>
  <h3 className="font-semibold text-gray-900">{title}</h3>
  <p className="text-sm text-gray-600">Weight: {weight}% of overall ECI score</p>
</div>

// AFTER:
<div>
  <h3 className="font-semibold text-gray-900">{title}</h3>
  {showScores && (
    <p className="text-sm text-gray-600">Weight: {weight}% of overall ECI score</p>
  )}
</div>
```

### 2. SupportSettings.tsx Preview
**File**: `src/pages/admin/SupportSettings.tsx`
**Lines**: 177-211

**Change**: Updated "Scores ON" preview to show weight information

```tsx
// Added weight display to preview
<p className="text-xs text-gray-500">Weight: 60% of overall ECI score</p>
```

The "Scores OFF" preview already correctly omitted weight information.

---

## 🎨 Design Rationale

### Why Remove Weight Information?

1. **Consistency**: Weight percentages are metrics, same as scores
2. **Focus**: Coaching mode should emphasize qualitative feedback
3. **Clarity**: Removing all numerical indicators makes the mode distinction clearer
4. **User Feedback**: Support stakeholders want pure coaching focus

### What Gets Hidden?

When `showScores = false`:
- ❌ Percentage scores (75%)
- ❌ Y/N/U counts (5Y / 2N / 1U)
- ❌ Weight information (60% of overall ECI score)
- ✅ Section titles remain (Care for Customer, etc.)
- ✅ Qualitative badges show (Strong Performance, etc.)
- ✅ Icons remain for visual organization

---

## ✅ Testing Checklist

- [x] Weight shows when scores are enabled
- [x] Weight hides when scores are disabled
- [x] No layout shifts between modes
- [x] Preview cards accurately reflect both modes
- [x] No TypeScript errors
- [x] No console warnings

---

## 🔄 Related Changes

This update is part of the larger **Support Mode Scoring Toggle** feature:
- Database: `organization_settings` table
- Service: `organizationSettingsService.ts`
- Hook: `useSupportModeShowScores()`
- Admin UI: `/admin/support-settings`
- Main docs: `docs/SUPPORT_MODE_SCORING_FEATURE.md`

---

## 📊 Impact

**User Groups Affected**:
- Support team members viewing ECI coaching insights
- Managers/coaches reviewing support calls

**Behavioral Changes**:
- When scores disabled: Cleaner, coaching-focused UI
- When scores enabled: Full metrics visibility (unchanged)

**Data Impact**: None - all underlying data preserved

---

**Updated By**: Claude Code Assistant
**Reviewed By**: User
**Status**: ✅ Production Ready
