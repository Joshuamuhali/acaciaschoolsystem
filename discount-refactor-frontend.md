# Discount System Refactor - Frontend Implementation Guide

## 🎯 Objective
Refactor the entire discount system from **transaction-level** to **pupil-level** discounts.

## 🚨 Current Problems to Fix

### ❌ Wrong Logic (Current)
```typescript
// PupilProfile.tsx - WRONG
const discount = discountApplied ? discountPercentage : 0;
const effectiveAmount = amount - (amount * discount / 100);
// This applies discount to PARTIAL payments!
```

### ✅ Correct Logic (New)
```typescript
// Discount should be attached to PUPIL, not payment
// Discount reduces TOTAL OBLIGATION, not partial payments
```

## 📋 Frontend Changes Required

### 1. Remove Discount from Payment Forms

**Files to Update:**
- `src/pages/PupilProfile.tsx`
- Any payment recording components

**Remove These Elements:**
```typescript
// REMOVE from PupilProfile.tsx
const [discountApplied, setDiscountApplied] = useState(false);
const [discountPercentage, setDiscountPercentage] = useState(0);

// REMOVE this entire section
{/* Discount Section */}
<div className="space-y-3">
  <div className="flex items-center space-x-2">
    <Checkbox
      id="apply-discount"
      checked={discountApplied}
      onCheckedChange={(checked) => setDiscountApplied(checked === true)}
    />
    <Label htmlFor="apply-discount" className="cursor-pointer">Apply Discount</Label>
  </div>
  {discountApplied && (
    <div className="space-y-2">
      <Label htmlFor="discount-percentage">Discount Percentage (%)</Label>
      <Input
        id="discount-percentage"
        type="number"
        value={discountPercentage}
        onChange={(e) => setDiscountPercentage(Number(e.target.value))}
        min="0"
        max="100"
        step="0.01"
        placeholder="e.g. 10.00"
      />
      {discountPercentage > 0 && payAmount && (
        <div className="text-xs text-muted-foreground">
          Effective amount: ZMW {(Number(payAmount) - (Number(payAmount) * discountPercentage / 100)).toLocaleString()}
        </div>
      )}
    </div>
  )}
</div>
```

**Update Payment Recording Function:**
```typescript
// BEFORE (Wrong)
await supabase.rpc('record_payment', {
  p_pupil_id: id,
  p_school_fee_id: payFee.id,
  p_amount: amount,
  p_discount: discount, // ❌ REMOVE THIS
  p_rct_no: payRCT
});

// AFTER (Correct)
await supabase.rpc('record_payment', {
  p_pupil_id: id,
  p_school_fee_id: payFee.id,
  p_amount: amount, // Record exact amount paid
  p_rct_no: payRCT
  // No discount parameter!
});
```

### 2. Add Discount Management to Pupil Profile

**Add to `src/pages/PupilProfile.tsx`:**
```typescript
// Add these state variables
const [discountSettings, setDiscountSettings] = useState({
  hasDiscount: false,
  discountType: 'percentage' as 'percentage' | 'fixed',
  discountValue: 0,
  appliesTo: 'tuition' as 'tuition' | 'transport' | 'lunch' | 'all',
  reason: '',
  termSpecific: false,
  selectedTerm: ''
});

// Add this function to load pupil discounts
const loadPupilDiscounts = async () => {
  const { data } = await supabase
    .from('pupil_discounts')
    .select('*')
    .eq('pupil_id', id)
    .eq('is_active', true);
  
  if (data && data.length > 0) {
    const discount = data[0];
    setDiscountSettings({
      hasDiscount: true,
      discountType: discount.discount_type,
      discountValue: discount.discount_value,
      appliesTo: discount.applies_to,
      reason: discount.reason || '',
      termSpecific: !!discount.term_id,
      selectedTerm: discount.term_id || ''
    });
  }
};

// Add this to useEffect
useEffect(() => {
  load();
  loadPupilDiscounts();
}, [id]);

// Add this function to save discount settings
const saveDiscountSettings = async () => {
  if (!discountSettings.hasDiscount) {
    // Remove all discounts
    await supabase
      .from('pupil_discounts')
      .update({ is_active: false })
      .eq('pupil_id', id);
  } else {
    // Upsert discount
    await supabase
      .from('pupil_discounts')
      .upsert({
        pupil_id: id,
        discount_type: discountSettings.discountType,
        discount_value: discountSettings.discountValue,
        applies_to: discountSettings.appliesTo,
        term_id: discountSettings.termSpecific ? discountSettings.selectedTerm : null,
        is_active: true,
        reason: discountSettings.reason,
        created_by: 'current_user' // Replace with actual user
      });
  }
  
  toast({ title: "Discount settings updated successfully" });
  loadPupilDiscounts();
};
```

**Add Discount Management UI to Pupil Profile:**
```typescript
{/* Add this section in PupilProfile.tsx */}
<Card className="mb-6">
  <CardHeader>
    <CardTitle className="text-lg">Financial Settings</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center space-x-2">
      <Checkbox
        id="has-discount"
        checked={discountSettings.hasDiscount}
        onCheckedChange={(checked) => 
          setDiscountSettings(prev => ({ ...prev, hasDiscount: checked === true }))
        }
      />
      <Label htmlFor="has-discount" className="cursor-pointer">Enable Discount</Label>
    </div>
    
    {discountSettings.hasDiscount && (
      <div className="space-y-4 pl-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Discount Type</Label>
            <select 
              value={discountSettings.discountType}
              onChange={(e) => setDiscountSettings(prev => ({ 
                ...prev, 
                discountType: e.target.value as 'percentage' | 'fixed'
              }))}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (ZMW)</option>
            </select>
          </div>
          
          <div>
            <Label>
              {discountSettings.discountType === 'percentage' ? 'Discount %' : 'Discount Amount (ZMW)'}
            </Label>
            <Input
              type="number"
              value={discountSettings.discountValue}
              onChange={(e) => setDiscountSettings(prev => ({ 
                ...prev, 
                discountValue: Number(e.target.value) 
              }))}
              min="0"
              max={discountSettings.discountType === 'percentage' ? '100' : '10000'}
              step={discountSettings.discountType === 'percentage' ? '0.01' : '0.01'}
              placeholder={discountSettings.discountType === 'percentage' ? '10.00' : '500.00'}
            />
          </div>
        </div>
        
        <div>
          <Label>Applies To</Label>
          <select 
            value={discountSettings.appliesTo}
            onChange={(e) => setDiscountSettings(prev => ({ 
              ...prev, 
              appliesTo: e.target.value as 'tuition' | 'transport' | 'lunch' | 'all'
            }))}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="tuition">Tuition Only</option>
            <option value="transport">Transport Only</option>
            <option value="lunch">Lunch Only</option>
            <option value="all">All Fees</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="term-specific"
            checked={discountSettings.termSpecific}
            onCheckedChange={(checked) => 
              setDiscountSettings(prev => ({ ...prev, termSpecific: checked === true }))
            }
          />
          <Label htmlFor="term-specific">Term Specific Discount</Label>
        </div>
        
        {discountSettings.termSpecific && (
          <div>
            <Label>Select Term</Label>
            <select 
              value={discountSettings.selectedTerm}
              onChange={(e) => setDiscountSettings(prev => ({ 
                ...prev, 
                selectedTerm: e.target.value 
              }))}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Select Term</option>
              {/* Add term options here */}
            </select>
          </div>
        )}
        
        <div>
          <Label>Reason (Optional)</Label>
          <Input
            value={discountSettings.reason}
            onChange={(e) => setDiscountSettings(prev => ({ 
              ...prev, 
              reason: e.target.value 
            }))}
            placeholder="e.g., Staff Child, Scholarship, Sibling Discount"
          />
        </div>
        
        <Button onClick={saveDiscountSettings} className="w-full">
          Save Discount Settings
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

### 3. Update Dashboard Discount Display

**Update `src/pages/Dashboard.tsx`:**
```typescript
// Remove old discount calculation logic
// The dashboard_stats view now handles discount calculations correctly

// Update discount cards to use new data
const discountCards = [
  { 
    label: "Total Discount Given", 
    value: `ZMW ${(stats.totalDiscountAmount || 0).toLocaleString()}`, 
    color: "text-purple-500" 
  },
  { 
    label: "Pupils with Discounts", 
    value: stats.pupilsWithDiscounts || 0, 
    color: "text-blue-500" 
  },
  { 
    label: "Net Expected Revenue", 
    value: `ZMW ${((stats.totalExpected || 0) - (stats.totalDiscountAmount || 0)).toLocaleString()}`, 
    color: "text-green-500" 
  }
];
```

### 4. Update Payment Edit Logic

**Update payment editing to remove discount handling:**
```typescript
// Remove discount-related code from payment edit functions
// Payments should only edit amount_paid, RCT_no, etc.
// No discount calculations during payment editing
```

### 5. Update Services

**Update `src/services/fees.ts`:**
```typescript
// Remove any discount-related functions that operate on installments
// Add new functions for pupil discount management

export const getPupilDiscounts = async (pupilId: string) => {
  const { data } = await supabase
    .from('pupil_discounts')
    .select('*')
    .eq('pupil_id', pupilId)
    .eq('is_active', true);
  return data;
};

export const savePupilDiscount = async (discount: any) => {
  const { data } = await supabase
    .from('pupil_discounts')
    .upsert(discount)
    .select();
  return data;
};

export const removePupilDiscount = async (pupilId: string) => {
  const { data } = await supabase
    .from('pupil_discounts')
    .update({ is_active: false })
    .eq('pupil_id', pupilId);
  return data;
};
```

## 🔄 Migration Steps

### Phase 1: Database Schema
1. ✅ Run `discount-refactor-schema.sql`
2. ✅ Execute migration: `SELECT migrate_discounts_to_pupil_level();`
3. ✅ Verify data: `SELECT * FROM pupil_discounts WHERE is_active = true;`

### Phase 2: Frontend Updates
1. ❌ Remove discount from payment forms
2. ❌ Add discount management to pupil profiles
3. ❌ Update dashboard display
4. ❌ Update payment editing logic
5. ❌ Update services

### Phase 3: Testing
1. Test discount application on pupil profile
2. Test payment recording (no discount parameter)
3. Test fee calculations with discounts
4. Test reporting accuracy

### Phase 4: Cleanup
1. Remove old discount columns from installments table
2. Update documentation
3. Train users on new discount workflow

## 🎯 Expected Behavior After Refactor

### ✅ Correct Financial Logic
```
Base Fee: ZMW 2,400
Pupil Discount: 10%
Net Obligation: ZMW 2,160

Payment 1: ZMW 1,000
Remaining: ZMW 1,160

Payment 2: ZMW 1,160
Remaining: ZMW 0
```

### ✅ Discount Characteristics
- **Permanent:** Attached to pupil profile
- **Consistent:** Same discount for all payments
- **Predictable:** Outstanding balances are accurate
- **Reportable:** Clear discount tracking

## 🚨 Important Notes

1. **No Transaction-Level Discounts:** Never apply discounts during payment recording
2. **P-Level Only:** All discount logic must be at pupil level
3. **Immutable Payments:** Payment amounts should never be modified by discounts
4. **Clear Separation:** Discount calculation separate from payment processing

## 📞 Support

If you encounter issues:
1. Check database migration completion
2. Verify pupil discount records exist
3. Test fee calculation functions
4. Validate payment recording without discounts
