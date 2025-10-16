const { createClient } = require('@supabase/supabase-js');

// === USE THE SAME CREDENTIALS AS IN users.js ===
const supabaseUrl = 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const ADMIN_PASSWORD = 'MySecureAdminPass123';
// =================================================

const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

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
          body: JSON.stringify({ status: 'success', message: 'User banned successfully' })
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
          body: JSON.stringify({ status: 'success', message: 'User unbanned successfully' })
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
          body: JSON.stringify({ status: 'success', message: 'Balance updated successfully' })
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
