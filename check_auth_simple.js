// Simple authentication check
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egafqqiwwratiqrnkdfd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWZxcWl3d3JhdGlxcm5rZGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjM1MTksImV4cCI6MjA4Njc5OTUxOX0.H2DXmNUQfsb3peYX6pR1Eo0LIKDeYZAS_blCTrfBrsw'
);

async function checkAuth() {
  try {
    console.log('🔍 Checking authentication status...');
    
    // Try to get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Error getting user:', userError.message);
      return;
    }
    
    if (!user) {
      console.log('❌ No authenticated user found');
      console.log('💡 You need to login first at http://localhost:8080/login');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      created: user.created_at,
      last_sign_in: user.last_sign_in_at,
      email_confirmed: user.email_confirmed_at
    });
    
    // Check user metadata for role
    console.log('📋 User metadata:', user.user_metadata);
    
    // Check if role is in metadata
    const role = user.user_metadata?.role;
    console.log('🎭 User role from metadata:', role || 'No role found');
    
    if (!role) {
      console.log('❌ No role assigned to user');
      console.log('💡 Need to assign Super Admin role to this user');
    } else if (role === 'SuperAdmin') {
      console.log('🎉 User has Super Admin role - should have full access');
    } else {
      console.log('ℹ️ User has role:', role);
    }
    
  } catch (error) {
    console.error('❌ Authentication check failed:', error.message);
  }
}

checkAuth();
