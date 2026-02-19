// Check authentication status for acaciaprojects86@gmail.com
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egafqqiwwratiqrnkdfd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWZxcWl3d3JhdGlxcm5rZGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjM1MTksImV4cCI6MjA4Njc5OTUxOX0.H2DXmNUQfsb3peYX6pR1Eo0LIKDeYZAS_blCTrfBrsw'
);

async function checkAuthStatus() {
  try {
    console.log('🔍 Checking authentication status for acaciaprojects86@gmail.com...');
    
    // 1. Check if user exists
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('❌ Error getting user:', userError.message);
      return;
    }
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      created: user.created_at,
      last_sign_in: user.last_sign_in_at,
      email_confirmed: user.email_confirmed_at
    });
    
    // 2. Check user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.log('⚠️ Profile error (may not exist yet):', profileError.message);
    } else if (profile) {
      console.log('✅ Profile found:', profile);
    }
    
    // 3. Check user role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (roleError) {
      console.log('⚠️ Role error (may not exist yet):', roleError.message);
    } else if (userRole) {
      console.log('✅ User role:', userRole);
    } else {
      console.log('❌ No role assigned');
    }
    
    // 4. Check if user can access basic features
    try {
      const { data: users, error: usersError } = await supabase
        .from('users_with_roles_enhanced' as any)
        .select('*')
        .eq('email', 'acaciaprojects86@gmail.com')
        .single();
      
      if (usersError) {
        console.log('⚠️ Enhanced users view error:', usersError.message);
      } else if (users) {
        console.log('✅ Enhanced user data:', {
          status: users.status,
          role: users.role,
          pupils_managed: users.pupils_managed
        });
      }
    } catch (err) {
      console.log('⚠️ Enhanced users view not available:', err.message);
    }
    
    // 5. Test basic permissions (if RBAC is implemented)
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('school_settings' as any)
        .select('*')
        .single();
      
      if (settingsError) {
        console.log('⚠️ School settings error:', settingsError.message);
      } else if (settings) {
        console.log('✅ School settings accessible:', {
          school_name: settings.school_name,
          currency_symbol: settings.currency_symbol,
          allow_partial_payments: settings.allow_partial_payments
        });
      }
    } catch (err) {
      console.log('⚠️ School settings not available:', err.message);
    }
    
    console.log('🎉 Authentication check complete!');
    
  } catch (error) {
    console.error('❌ Authentication check failed:', error.message);
  }
}

checkAuthStatus();
