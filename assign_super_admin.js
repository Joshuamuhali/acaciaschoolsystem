// Assign Super Admin role to acaciaprojects86@gmail.com
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egafqqiwwratiqrnkdfd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWZxcWl3d3JhdGlxcm5rZGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjM1MTksImV4cCI6MjA4Njc5OTUxOX0.H2DXmNUQfsb3peYX6pR1Eo0LIKDeYZAS_blCTrfBrsw'
);

async function assignSuperAdmin() {
  try {
    console.log('🔧 Assigning Super Admin role to acaciaprojects86@gmail.com...');
    
    // First, sign in with the user to get their session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'acaciaprojects86@gmail.com',
      password: 'your_password_here' // You'll need to provide the actual password
    });
    
    if (signInError) {
      console.error('❌ Sign in error:', signInError.message);
      console.log('💡 Please login at http://localhost:8080/login first');
      return;
    }
    
    if (!signInData.user) {
      console.error('❌ No user found after sign in');
      return;
    }
    
    console.log('✅ User signed in:', signInData.user.email);
    
    // Update user metadata to include Super Admin role
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      data: { 
        role: 'SuperAdmin',
        is_super_admin: true
      }
    });
    
    if (updateError) {
      console.error('❌ Error updating user metadata:', updateError.message);
      return;
    }
    
    console.log('✅ User metadata updated:', updateData.user.user_metadata);
    
    // Also update the user_roles table if it exists
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: signInData.user.id,
          role: 'SuperAdmin',
          assigned_by: signInData.user.id,
          assigned_at: new Date().toISOString()
        })
        .select();
      
      if (roleError) {
        console.log('⚠️ Could not update user_roles table:', roleError.message);
      } else {
        console.log('✅ User role assigned in database:', roleData);
      }
    } catch (err) {
      console.log('⚠️ User roles table may not exist:', err.message);
    }
    
    console.log('🎉 Super Admin role assigned successfully!');
    console.log('💡 Now refresh your browser and you should see the admin panel');
    
  } catch (error) {
    console.error('❌ Assignment failed:', error.message);
  }
}

assignSuperAdmin();
