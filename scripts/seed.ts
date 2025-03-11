import { seedData } from "@/lib/db/seed"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://fqdpwneipzsvkyciairx.supabase.co"
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxZHB3bmVpcHpzdmt5Y2lhaXJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTYxODYzNCwiZXhwIjoyMDU3MTk0NjM0fQ.Id2eINglR7_du-g1OoT5tvAtEBTGHBnFDQw8sbu4yNE"

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  // Try to get the existing user first
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error("Error listing users:", listError)
    return
  }

  let userId: string

  const existingUser = users.find(user => user.email === "test@example.com")
  if (existingUser) {
    console.log("Using existing test user:", existingUser.id)
    userId = existingUser.id
  } else {
    // Create a new test user if none exists
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: "test@example.com",
      password: "password123",
      email_confirm: true
    })

    if (createError) {
      console.error("Error creating user:", createError)
      return
    }

    console.log("Created new test user:", userData.user.id)
    userId = userData.user.id
  }

  // Seed data for the user
  await seedData(userId)
}

main()
  .catch((error) => {
    console.error("Error running seed script:", error)
    process.exit(1)
  })
  .finally(async () => {
    process.exit(0)
  }) 