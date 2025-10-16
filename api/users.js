const { createClient } = require('@supabase/supabase-js');

// === USE THE SAME CREDENTIALS AS IN admin.js ===
const supabaseUrl = 'https://lgqmzfecvmkqtlvbemkj.supabase.co'; // SAME AS admin.js
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncW16ZmVjdm1rcXRsdmJlbWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjUyNDYsImV4cCI6MjA3NjE0MTI0Nn0.Z5-DFBoUsIBBsD8rimKkpAbpkWfr4QyB8JfDJOnhDFc'; // SAME AS admin.js
const ADMIN_PASSWORD = '@Admin226'; // SAME AS admin.js
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
    const { action, user_id, username, first_name, tasks, balance, admin_key } = params;

    console.log('Action:', action, 'User ID:', user_id);

    switch (action) {
      case 'getUser':
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user_id)
          .single();

        if (userError && userError.code === 'PGRST116') {
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([
              {
                user_id: user_id,
                username: username || '',
                first_name: first_name || '',
                tasks: '[]',
                balance: 0,
                total_earned: 0,
                status: 'active',
                banned: false
              }
            ])
            .select()
            .single();

          if (createError) throw createError;
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: 'success', data: newUser })
          };
        } else if (userError) {
          throw userError;
        } else {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ status: 'success', data: user })
          };
        }

      case 'updateUser':
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            tasks: tasks,
            balance: parseFloat(balance) || 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user_id)
          .select()
          .single();

        if (updateError) throw updateError;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: 'success', data: updatedUser })
        };

      case 'addEarning':
        const { data: earning, error: earningError } = await supabase
          .from('earnings_history')
          .insert([
            {
              user_id: user_id,
              amount: parseFloat(balance) || 0,
              task_description: 'Task completion',
              created_at: new Date().toISOString()
            }
          ]);

        if (earningError) throw earningError;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: 'success' })
        };

      case 'getAllUsers':
        if (admin_key !== ADMIN_PASSWORD) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
          };
        }

        const { data: allUsers, error: allError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (allError) throw allError;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ status: 'success', data: allUsers })
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
