const { createClient } = require('@supabase/supabase-js');

// === REPLACE THESE VALUES WITH YOUR ACTUAL CREDENTIALS ===
const supabaseUrl = 'https://lgqmzfecvmkqtlvbemkj.supabase.co'; // REPLACE THIS
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncW16ZmVjdm1rcXRsdmJlbWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjUyNDYsImV4cCI6MjA3NjE0MTI0Nn0.Z5-DFBoUsIBBsD8rimKkpAbpkWfr4QyB8JfDJOnhDFc'; // REPLACE THIS
const ADMIN_PASSWORD = '@Admin226'; // CHOOSE STRONG PASSWORD
// =========================================================

const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const { action, user_id, admin_key, task_text, reward, task_id, balance } = params;

    // Verify admin access - use the direct password
    if (admin_key !== ADMIN_PASSWORD) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    console.log('Admin Action:', action, 'User ID:', user_id);

    switch (action) {
      case 'banUser':
        const { error: banError } = await supabase
          .from('users')
          .update({ 
            banned: true, 
            status: 'banned',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user_id);

        if (banError) throw banError;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            status: 'success', 
            message: 'User banned successfully' 
          })
        };

      case 'unbanUser':
        const { error: unbanError } = await supabase
          .from('users')
          .update({ 
            banned: false, 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user_id);

        if (unbanError) throw unbanError;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            status: 'success', 
            message: 'User unbanned successfully' 
          })
        };

      case 'updateBalance':
        const { error: balanceError } = await supabase
          .from('users')
          .update({ 
            balance: parseFloat(balance) || 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user_id);

        if (balanceError) throw balanceError;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            status: 'success', 
            message: 'Balance updated successfully' 
          })
        };

      case 'addGlobalTask':
        const { error: taskError } = await supabase
          .from('global_tasks')
          .insert([
            {
              task_text: task_text,
              reward: parseFloat(reward) || 1.00,
              status: 'active',
              created_at: new Date().toISOString()
            }
          ]);

        if (taskError) throw taskError;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            status: 'success', 
            message: 'Global task added successfully' 
          })
        };

      case 'getStats':
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*');

        const { data: earnings, error: earningsError } = await supabase
          .from('earnings_history')
          .select('amount');

        if (usersError) throw usersError;
        if (earningsError) throw earningsError;

        const totalUsers = users.length;
        const totalBalance = users.reduce((sum, user) => sum + parseFloat(user.balance || 0), 0);
        const totalEarnings = earnings.reduce((sum, earning) => sum + parseFloat(earning.amount || 0), 0);
        const bannedUsers = users.filter(user => user.banned).length;
        const activeUsers = totalUsers - bannedUsers;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'success',
            data: {
              totalUsers,
              totalBalance: totalBalance.toFixed(2),
              totalEarnings: totalEarnings.toFixed(2),
              bannedUsers,
              activeUsers
            }
          })
        };

      case 'deleteUser':
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('user_id', user_id);

        if (deleteError) throw deleteError;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            status: 'success', 
            message: 'User deleted successfully' 
          })
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }
  } catch (error) {
    console.error('Admin Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
