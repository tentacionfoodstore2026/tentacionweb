import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://juksmchvbblljkhixcda.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1a3NtY2h2YmJsbGpraGl4Y2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjM1ODYsImV4cCI6MjA5MTMzOTU4Nn0.-loFy9K9oT323x5Q_pvr78rgP65mf7-A4-9BmkhiFho';

// Nota: Normalmente no deberíamos usar la anon key para crear tablas. 
// Supabase no permite DDL (crear tablas) a través de su cliente estándar JS por seguridad.
// La única forma correcta de aplicar esto es a través de SQL Editor en el dashboard de Supabase,
// o si tuviéramos un JWT con permisos de postgres o la Service Role Key.
