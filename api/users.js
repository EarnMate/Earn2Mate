const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, user_id, username, first_name, tasks, balance, admin_key } = req.query;

  try {
    switch (action) {
      case 'getUser':
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user_id)
          .single();

        if (userError && userError.code === 'PGRST116') {
          // User doesn't exist, create new user
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([
              {
                user_id: user_id,
                username: username,
                first_name: first_name,
                tasks: '[]',
                balance: 0,
                status: 'active'
              }
            ])
            .select()
            .single();

          if (createError) throw createError;
          res.json({ status: 'success', data: newUser });
        } else if (userError) {
          throw userError;
        } else {
          res.json({ status: 'success', data: user });
        }
        break;

      case 'updateUser':
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            tasks: tasks,
            balance: balance,
            updated_at: new Date()
          })
          .eq('user_id', user_id)
          .select()
          .single();

        if (updateError) throw updateError;
        res.json({ status: 'success', data: updatedUser });
        break;

      case 'addEarning':
        const { data: earning, error: earningError } = await supabase
          .from('earnings_history')
          .insert([
            {
              user_id: user_id,
              amount: balance,
              task_description: 'Task completion'
            }
          ]);

        if (earningError) throw earningError;
        res.json({ status: 'success' });
        break;

      case 'getAllUsers':
        // Admin only endpoint
        if (admin_key !== process.env.ADMIN_KEY) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        const { data: allUsers, error: allError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (allError) throw allError;
        res.json({ status: 'success', data: allUsers });
        break;

      default:
        res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};
