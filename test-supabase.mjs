import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://mghfgcjcbpizjmfrtozi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1naGZnY2pjYnBpemptZnJ0b3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NjQ3NzIsImV4cCI6MjA4ODI0MDc3Mn0.GlpiV6vgDmpitprIZpMBvDcD-8ZvnnYZuTo3VqdUDvQ');

// Test read
const { data, error } = await supabase.from('ai_insights').select('id, investor_id, quarter').limit(3);
console.log('READ:', JSON.stringify(data || error));

// Test write with anon key
const { error: writeErr } = await supabase.from('ai_insights').upsert({
  investor_id: 'test-cowork',
  quarter: 'test',
  insights: [],
  model: 'test',
  generated_at: new Date().toISOString()
}, { onConflict: 'investor_id,quarter' });
console.log('WRITE:', writeErr ? writeErr.message : 'SUCCESS');

// Cleanup test
if (!writeErr) {
  const { error: delErr } = await supabase.from('ai_insights').delete().eq('investor_id', 'test-cowork');
  console.log('DELETE:', delErr ? delErr.message : 'cleaned up');
}
