import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zorxsnqmkprdtkkbjjrh.supabase.co'
const supabaseAnonKey = 'sb_publishable_7mCG5VZsSQ3OklZ6nwNVhw_bfANPvVJ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
