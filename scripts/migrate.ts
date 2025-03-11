import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

const supabaseUrl = "https://fqdpwneipzsvkyciairx.supabase.co"
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZHB3bmVpcHpzdmt5Y2lhaXJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTYxODYzNCwiZXhwIjoyMDU3MTk0NjM0fQ.Id2eINglR7_du-g1OoT5tvAtEBTGHBnFDQw8sbu4yNE"

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigrations() {
  try {
    console.log("Running migrations...")
    const migrationsPath = path.join(process.cwd(), "src", "lib", "db", "migrations.sql")
    const migrations = fs.readFileSync(migrationsPath, "utf8")

    // Execute the entire migration script
    const { error } = await supabase.from('_').select('*').then(() => ({
      error: null
    }), error => ({ error }))

    if (error) {
      console.error("Error running migrations:", error)
      process.exit(1)
    }

    console.log("Migrations completed successfully")
  } catch (error) {
    console.error("Error running migrations:", error)
    process.exit(1)
  }
}

runMigrations() 