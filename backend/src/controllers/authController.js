const db = require('../config/database');
const supabase = require('../config/supabase');

const DEMO_MODELS = [
  {
    name: 'PromptWall v0.1',
    description: 'Early-stage training model. Starts with no injection detection knowledge.',
    base_model: 'llama-3.1-8b-instant'
  },
  {
    name: 'PromptWall v0.2',
    description: 'Second training instance for comparative experimentation.',
    base_model: 'llama-3.1-8b-instant'
  }
];

async function ensureLocalUser(client, authUser, name) {
  const displayName = name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User';

  const userResult = await client.query(
    `INSERT INTO users (id, name, email)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE
     SET name = EXCLUDED.name,
         email = EXCLUDED.email
     RETURNING id, name, email, created_at`,
    [authUser.id, displayName, authUser.email]
  );

  const modelCount = await client.query(
    'SELECT COUNT(*)::int AS count FROM training_llms WHERE user_id = $1',
    [authUser.id]
  );

  if (modelCount.rows[0].count === 0) {
    for (const model of DEMO_MODELS) {
      const modelResult = await client.query(
        'INSERT INTO training_llms (user_id, name, description, base_model) VALUES ($1, $2, $3, $4) RETURNING id',
        [authUser.id, model.name, model.description, model.base_model]
      );
      await client.query(
        'INSERT INTO training_knowledge (training_llm_id, knowledge_summary, current_accuracy, total_prompts, total_correct) VALUES ($1, $2, 0, 0, 0)',
        [modelResult.rows[0].id, '']
      );
    }
  }

  return userResult.rows[0];
}

async function signup(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) {
      const status = error.status === 422 ? 409 : 400;
      return res.status(status).json({ error: error.message });
    }
    if (!data.user) {
      return res.status(400).json({ error: 'Unable to create Supabase user' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const user = await ensureLocalUser(client, data.user, name);
      await client.query('COMMIT');

      if (!data.session?.access_token) {
        return res.status(201).json({
          user,
          message: 'Signup successful. Check your email to confirm your account before signing in.'
        });
      }

      return res.status(201).json({ token: data.session.access_token, user });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session?.access_token) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const user = await ensureLocalUser(client, data.user);
      await client.query('COMMIT');

      res.json({ token: data.session.access_token, user });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function me(req, res) {
  try {
    const result = await db.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { signup, login, me };
