var { createClient } = require("@supabase/supabase-js");

var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL e SUPABASE_ANON_KEY precisam estar configurados no .env.local");
}

var supabase = createClient(supabaseUrl || "", supabaseKey || "");

module.exports = { supabase: supabase };
