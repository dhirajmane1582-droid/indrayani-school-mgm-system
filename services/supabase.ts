
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tubdjcdghosxozzehuep.supabase.co';
const supabaseAnonKey = 'sb_publishable_423Kdb9hmKQ6VI7OhdkJBw_haTm_UF0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
