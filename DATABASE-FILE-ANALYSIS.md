# Database Files Analysis - School System Codebase

## 📁 **Database Files Found**

I scanned the codebase and found **14 SQL files** across the root directory and `data backup/` folder. No separate `database/` folder exists.

## 🗂️ **File Categories & Patterns**

### **1. Main Schema Files (Root Directory)**

| File | Purpose | Pattern | Key Features |
|------|---------|---------|--------------|
| `final-unified-schema.sql` | **PRIMARY** - Complete unified system | ✅ **Current Best** | All 156 pupils, pupil discounts, fee toggling |
| `complete-database-schema.sql` | Complete system with discounts | ✅ **Legacy** | Pupil-level discounts, all pupils |
| `database-migration.sql` | Migration/fixed schema | ⚠️ **Transitional** | DROP/CREATE pattern, basic structure |
| `discount-refactor-schema.sql` | Discount system refactor | 🔧 **Specialized** | Pupil discount table design only |
| `disable-rls-policies.sql` | RLS management | 🔧 **Utility** | Disable Row Level Security |

### **2. Data Backup Files (`data backup/` folder)**

| File | Content | Pattern | Notes |
|------|---------|---------|-------|
| `pupils_rows.sql` | 156 pupil records | 📊 **INSERT statements** | Single line, comma-separated |
| `grades_rows.sql` | 10 grade records | 📊 **INSERT statements** | With default_fees arrays |
| `school_fees_rows.sql` | School fee records | 📊 **INSERT statements** | 2400.00 default fees |
| `other_fees_rows.sql` | Other fee records | 📊 **INSERT statements** | Maintenance, Sports, etc. |
| `terms_rows.sql` | Term records | 📊 **INSERT statements** | Academic terms |
| `pupil_financial_summary_rows.sql` | Financial summaries | 📊 **INSERT statements** | Dashboard data |
| `other_fees_breakdown_rows.sql` | Fee breakdowns | 📊 **INSERT statements** | Analytics data |

## 🔄 **Common Patterns Identified**

### **Schema Structure Pattern**
```sql
-- 1. Header with purpose
-- =====================================================
-- DESCRIPTION
-- =====================================================

-- 2. Database cleanup (in most files)
DROP TABLE IF EXISTS ... CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;

-- 3. Core tables in dependency order
CREATE TABLE school_settings (...);
CREATE TABLE grades (...);
CREATE TABLE terms (...);
CREATE TABLE pupils (...);
CREATE TABLE pupil_discounts (...);
CREATE TABLE school_fees (...);
CREATE TABLE other_fees (...);

-- 4. Indexes and constraints
CREATE INDEX ...;
ALTER TABLE ... ADD CONSTRAINT ...;

-- 5. Functions and triggers
CREATE OR REPLACE FUNCTION ...;
CREATE TRIGGER ...;

-- 6. Views
CREATE OR REPLACE VIEW ...;

-- 7. Sample data
INSERT INTO ... VALUES (...);
```

### **Data Backup Pattern**
```sql
-- Single line INSERT statements
INSERT INTO "public"."table_name" ("col1", "col2", ...) VALUES 
('uuid1', 'data1', ...), 
('uuid2', 'data2', ...), 
...;
```

## 📊 **Key Schema Evolution**

### **Version 1: Basic Structure** (`database-migration.sql`)
- Simple DROP/CREATE pattern
- Basic tables without discounts
- Transaction-level discounts

### **Version 2: Discount Refactor** (`discount-refactor-schema.sql`)
- Introduced `pupil_discounts` table
- Moved from transaction to pupil-level discounts
- Percentage/fixed discount support

### **Version 3: Complete System** (`complete-database-schema.sql`)
- Full 156 pupils integration
- All discount functions
- Complete fee management

### **Version 4: Final Unified** (`final-unified-schema.sql`) ⭐ **CURRENT**
- **All features combined**
- **Fee toggling with `is_active` column**
- **Real-time discount calculations**
- **Complete sample data with realistic discounts**

## 🎯 **Recommended Usage**

### **For Production:**
```sql
-- Use final-unified-schema.sql
-- ✅ Complete system
-- ✅ All features working
-- ✅ Real data included
```

### **For Development:**
```sql
-- Use complete-database-schema.sql (legacy)
-- ⚠️ Older version, missing fee toggling
```

### **For Reference:**
```sql
-- Use discount-refactor-schema.sql
-- 🔧 Understanding discount architecture
```

## 📋 **File Relationships**

```
final-unified-schema.sql (PRIMARY)
    ├── Complete schema from complete-database-schema.sql
    ├── Enhanced discount logic from discount-refactor-schema.sql
    ├── All data from data backup/ files
    └── New fee toggling features
```

## 🔍 **Key Technical Patterns**

### **UUID Primary Keys**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

### **Timestamp Pattern**
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### **Array Usage**
```sql
default_fees TEXT[] DEFAULT '{}'  -- In grades table
```

### **JSON Logging**
```sql
parameters JSONB  -- In payment_log table
```

### **Conditional Constraints**
```sql
CHECK (discount_type IN ('percentage', 'fixed'))
CHECK (applies_to IN ('tuition', 'transport', 'lunch', 'all'))
```

## 📈 **Data Volume Analysis**

| Table | Records | Size |
|-------|---------|------|
| pupils | 156 | Complete school |
| grades | 10 | Baby Class → Grade 7 |
| school_fees | 156 | One per pupil |
| other_fees | ~600 | Multiple per pupil |
| pupil_discounts | ~25 | Realistic discount data |

## 🎯 **Conclusion**

The codebase follows a **clear evolution pattern** from basic structure → discount refactor → complete unified system. The **`final-unified-schema.sql`** is the definitive file containing all features and should be used for any new deployments.

The **`data backup/`** folder contains raw INSERT statements that were likely exported from a running database and serve as reference data.
