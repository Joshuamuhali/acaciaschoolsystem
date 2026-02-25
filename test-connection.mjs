import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', process.env.VITE_SUPABASE_URL);
  console.log('Key exists:', !!process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  try {
    // Test basic connection
    const { data, error } = await supabase.from('grades').select('count').single();
    if (error) {
      console.error('Connection error:', error);
    } else {
      console.log('Connection successful!');
      console.log('Data:', data);
    }

    // Test fetch all data
    const { data: allData, error: fetchError } = await supabase
      .from('grades')
      .select('id, name, created_at');
    
    if (fetchError) {
      console.error('Fetch error:', fetchError);
    } else {
      console.log('All grades:', allData);
    }

  } catch (err) {
    console.error('General error:', err);
  }
}

testConnection();
