const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, user_id, admin_key, task_text, reward, task_id } = req.query;

  // Verify admin access
  if (admin_key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    switch (action) {
      case 'banUser':
        const { error: banError } = await supabase
          .from('users')
          .update({ banned: true, status: 'banned' })
          .eq('user_id', user_id);

        if (banError) throw banError;
        res.json({ status: 'success', message: 'User banned' });
        break;

      case 'unbanUser':
        const { error: unbanError } = await supabase
          .from('users')
          .update({ banned: false, status: 'active' })
          .eq('user_id', user_id);

        if (unbanError) throw unbanError;
        res.json({ status: 'success', message: 'User unbanned' });
        break;

      case 'updateBalance':
        const { balance } = req.query;
        const { error: balanceError } = await supabase
          .from('users')
          .update({ balance: balance })
          .eq('user_id', user_id);

        if (balanceError) throw balanceError;
        res.json({ status: 'success', message: 'Balance updated' });
        break;

      case 'addGlobalTask':
        const { error: taskError } = await supabase
          .from('global_tasks')
          .insert([
            {
              task_text: task_text,
              reward: reward || 1.00,
              status: 'active'
            }
          ]);

        if (taskError) throw taskError;
        res.json({ status: 'success', message: 'Task added' });
        break;

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

        res.json({
          status: 'success',
          data: {
            totalUsers,
            totalBalance,
            totalEarnings,
            bannedUsers,
            activeUsers: totalUsers - bannedUsers
          }
        });
        break;

      default:
        res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};
