
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://juksmchvbblljkhixcda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1a3NtY2h2YmJsbGpraGl4Y2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjM1ODYsImV4cCI6MjA5MTMzOTU4Nn0.-loFy9K9oT323x5Q_pvr78rgP65mf7-A4-9BmkhiFho';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBusinesses() {
  const { data, error, count } = await supabase
    .from('businesses')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Count of businesses:', count);
    console.log('Businesses:', data.map(b => b.name));
  }
}

checkBusinesses();
