
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qcysnurhwppzwfghpywt.supabase.co';
const supabaseAnonKey = 'sb_publishable_CUj8lScOpjFM4ZksuxMXiQ_vkB8Vq2T';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
