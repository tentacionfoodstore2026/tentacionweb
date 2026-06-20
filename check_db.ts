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
  const { data: promoData, error: promoError } = await supabase
    .from('promotions')
    .select('*')
    .limit(1);
    
  if (promoError) {
    console.error('Error fetching promotions:', promoError);
  } else {
    console.log('promotions first row:', promoData?.[0]);
  }
}

check();

