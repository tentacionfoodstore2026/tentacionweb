import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://juksmchvbblljkhixcda.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1a3NtY2h2YmJsbGpraGl4Y2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjM1ODYsImV4cCI6MjA5MTMzOTU4Nn0.-loFy9K9oT323x5Q_pvr78rgP65mf7-A4-9BmkhiFho';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('Fetching all driver_profiles...');
  const { data, error } = await supabase
    .from('driver_profiles')
    .select('*');
    
  if (error) {
    console.error('Error fetching driver_profiles:', error);
  } else {
    console.log('All driver_profiles:', data);
  }
}

inspect();
