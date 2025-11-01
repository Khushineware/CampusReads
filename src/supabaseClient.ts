import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fuvrodwqlhjhdvvxymas.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1dnJvZHdxbGhqaGR2dnh5bWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDMwMzQsImV4cCI6MjA3NjUxOTAzNH0.mQOI8Eb4MdTayUE27Fftx7RpmnjsHfRGXVpqIWHeKww'

export const supabase = createClient(supabaseUrl, supabaseKey)
