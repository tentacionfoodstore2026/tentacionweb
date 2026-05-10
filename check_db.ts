import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: mgData, error: mgError } = await supabase
    .from('modifier_groups')
    .select('*')
    .limit(1);
    
  console.log('modifier_groups:', mgData?.[0]);

  const { data: moData, error: moError } = await supabase
    .from('modifier_options')
    .select('*')
    .limit(1);

  console.log('modifier_options:', moData?.[0]);
}

check();
