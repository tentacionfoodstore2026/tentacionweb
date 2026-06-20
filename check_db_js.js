import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, category');
    
  if (error) {
    console.error('Error fetching products:', error);
  } else {
    const categories = [...new Set(products.map(p => p.category))];
    console.log('Unique product categories:', categories);
    console.log('Total products:', products.length);
    console.log('Sample products:', products.slice(0, 10));
  }
}

check();
