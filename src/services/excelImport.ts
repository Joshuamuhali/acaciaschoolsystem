import { supabase } from '../lib/supabase';

export interface ExcelImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  details?: any;
}

// Define database types for better type safety
interface PupilInsert {
  full_name: string;
  sex: string;
  grade_id?: string | null;
  status: string;
  phone?: string | null;
  address?: string | null;
  school_id: number;
}

interface GradeInsert {
  grade_name: string;
  section?: string | null;
  capacity?: number | null;
  teacher_name?: string | null;
  room_number?: string | null;
  school_id: number;
}

interface PaymentInsert {
  pupil_id: string;
  amount: number;
  status: string;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  term: string;
  school_id: number;
}

// Pupil Import Service
export async function importPupils(data: any[]): Promise<ExcelImportResult> {
  const errors: string[] = [];
  let imported = 0;

  try {
    for (const row of data) {
      try {
        // Validate required fields
        if (!row.full_name || !row.sex) {
          errors.push(`Row ${row._rowNumber}: Missing required fields (full_name, sex)`);
          continue;
        }

        // Check if grade exists
        let gradeId = null;
        if (row.grade) {
          const { data: gradeData } = await supabase
            .from('grades')
            .select('id')
            .eq('grade_name', row.grade)
            .single();

          if (gradeData && (gradeData as any).id) {
            gradeId = (gradeData as any).id;
          }
        }

        // Insert pupil
        const pupilData: PupilInsert = {
          full_name: row.full_name,
          sex: row.sex,
          grade_id: gradeId,
          status: row.status || 'New',
          phone: row.phone || null,
          address: row.address || null,
          school_id: 1, // TODO: Get from context
        };

        const { error } = await (supabase
          .from('pupils') as any)
          .insert(pupilData);

        if (error) {
          errors.push(`Row ${row._rowNumber}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (err) {
        errors.push(`Row ${row._rowNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [error instanceof Error ? error.message : 'Import failed']
    };
  }
}

// Grade Import Service
export async function importGrades(data: any[]): Promise<ExcelImportResult> {
  const errors: string[] = [];
  let imported = 0;

  try {
    for (const row of data) {
      try {
        // Validate required fields
        if (!row.grade_name) {
          errors.push(`Row ${row._rowNumber}: Missing required field (grade_name)`);
          continue;
        }

        const gradeData: GradeInsert = {
          grade_name: row.grade_name,
          section: row.section || null,
          capacity: row.capacity ? parseInt(row.capacity) : null,
          teacher_name: row.teacher_name || null,
          room_number: row.room_number || null,
          school_id: 1, // TODO: Get from context
        };

        const { error } = await (supabase
          .from('grades') as any)
          .insert(gradeData);

        if (error) {
          errors.push(`Row ${row._rowNumber}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (err) {
        errors.push(`Row ${row._rowNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [error instanceof Error ? error.message : 'Import failed']
    };
  }
}

// Fee Import Service
export async function importFees(data: any[]): Promise<ExcelImportResult> {
  const errors: string[] = [];
  let imported = 0;

  try {
    for (const row of data) {
      try {
        // Validate required fields
        if (!row.pupil_name || !row.amount) {
          errors.push(`Row ${row._rowNumber}: Missing required fields (pupil_name, amount)`);
          continue;
        }

        // Find pupil by name
        const { data: pupilData } = await (supabase
          .from('pupils') as any)
          .select('id')
          .eq('full_name', row.pupil_name)
          .single();

        if (!pupilData || !pupilData.id) {
          errors.push(`Row ${row._rowNumber}: Pupil not found: ${row.pupil_name}`);
          continue;
        }

        const paymentData: PaymentInsert = {
          pupil_id: pupilData.id,
          amount: parseFloat(row.amount),
          status: 'posted',
          payment_date: row.payment_date || new Date().toISOString(),
          payment_method: row.payment_method || 'Cash',
          receipt_number: row.receipt_number || `EXCEL-${Date.now()}`,
          term: row.term || 'Current',
          school_id: 1, // TODO: Get from context
        };

        const { error } = await (supabase
          .from('payments') as any)
          .insert(paymentData);

        if (error) {
          errors.push(`Row ${row._rowNumber}: ${error.message}`);
        } else {
          imported++;
        }
      } catch (err) {
        errors.push(`Row ${row._rowNumber}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors
    };
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: [error instanceof Error ? error.message : 'Import failed']
    };
  }
}
