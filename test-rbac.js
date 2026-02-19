// Test script to verify RBAC implementation
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://egafqqiwwratiqrnkdfd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWZxcWl3d3JhdGlxcm5rZGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjM1MTksImV4cCI6MjA4Njc5OTUxOX0.H2DXmNUQfsb3peYX6pR1Eo0LIKDeYZAS_blCTrfBrsw'
);

async function testRBAC() {
  console.log('🧪 Testing RBAC Implementation...\n');
  
  try {
    // Test 1: Check if Super Admin user exists
    console.log('📋 Test 1: Checking Super Admin user...');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log('✅ User found:', user.email);
      
      // Test 2: Check user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleData) {
        console.log('✅ Role found:', roleData.role);
      } else {
        console.log('❌ No role assigned');
      }
      
      // Test 3: Check permissions
      const { data: permissions } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('📊 User permissions:', permissions);
      
      // Test 4: Test permission function
      const { data: hasPermission } = await supabase
        .rpc('has_permission', {
          user_id: user.id,
          resource: 'users',
          action: 'read'
        });
      
      console.log('🔒 Can read users:', hasPermission);
      
      // Test 5: Test RLS policy
      const { data: pupils } = await supabase
        .from('pupils')
        .select('*')
        .limit(1);
      
      console.log('📋 Pupils query result:', pupils);
      
      if (pupils.length > 0) {
        console.log('✅ RLS working - can access pupils data');
      } else {
        console.log('❌ RLS not working - no pupils data');
      }
      
    } else {
      console.log('❌ No authenticated user');
    }
    
    console.log('\n🎉 RBAC Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRBAC();
