import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zorxsnqmkprdtkkbjjrh.supabase.co'
const supabaseAnonKey = 'sb_publishable_-lToeoaix_FlO7SjRxmKKw_kPGbClFd'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
