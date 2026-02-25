import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function audit() {
  console.log('Auditing Supabase fetch and push functions...');

  try {
    // Test fetch: select all grades
    const { data: grades, error: gError } = await supabase.from('grades').select('*');
    if (gError) {
      console.error('Fetch grades error:', gError);
    } else {
      console.log('Fetched grades:', grades);
    }

    // Test push: insert a grade
    const { data: newGrade, error: insertError } = await supabase.from('grades').insert({ name: 'Test Grade', capacity: 30, default_school_fee: 1000 }).select();
    if (insertError) {
      console.error('Push grade error:', insertError);
    } else {
      console.log('Pushed grade:', newGrade);
    }

    // Test fetch pupils
    const { data: pupils, error: pError } = await supabase.from('pupils').select('*, grades(name)');
    if (pError) {
      console.error('Fetch pupils error:', pError);
    } else {
      console.log('Fetched pupils:', pupils);
    }

    // Test fetch school_fees
    const { data: fees, error: fError } = await supabase.from('school_fees').select('*, terms(name), pupils(full_name)');
    if (fError) {
      console.error('Fetch school_fees error:', fError);
    } else {
      console.log('Fetched school_fees:', fees);
    }

  } catch (err) {
    console.error('General error:', err);
  }
}

audit();
