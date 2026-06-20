import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://juksmchvbblljkhixcda.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1a3NtY2h2YmJsbGpraGl4Y2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjM1ODYsImV4cCI6MjA5MTMzOTU4Nn0.-loFy9K9oT323x5Q_pvr78rgP65mf7-A4-9BmkhiFho';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
  console.log('Querying database tables...');
  // We can query postgrest to get details about tables/views/columns
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  // Since we don't have direct access to system catalogs easily through anon key (unless exposed),
  // let's try some known table names to see if they exist or throw an error.
  const tables = [
    'profiles',
    'businesses',
    'products',
    'orders',
    'order_items',
    'loyalty_cards',
    'promotions',
    'portal_settings',
    'driver_locations',
    'driver_sessions',
    'order_notifications',
    'push_notifications',
    'loyalty_redemptions',
    'coupon_redemptions',
    'driver_profiles',
    'drivers'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error) {
      console.log(`❌ Table ${table} does NOT exist or error:`, error.message);
    } else {
      console.log(`✅ Table ${table} exists!`);
    }
  }
}

inspectTables();
