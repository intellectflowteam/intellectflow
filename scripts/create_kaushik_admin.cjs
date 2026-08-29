const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://ltvzksmbrfnzcycknbqj.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dnprc21icmZuemN5Y2tuYnFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzM2NDU5MiwiZXhwIjoyMTAyOTQwNTkyfQ.X_OrglyFwPLu4KxguJhIYj4AJI6H92E7psE1tSLe9TI";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = "kaushiksavaliya909@gmail.com";
  const password = "25071995";

  console.log(`Checking existing user: ${email}...`);

  // 1. Get user list or create user
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("Failed to list users:", listErr);
    process.exit(1);
  }

  let existingUser = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  let userId;

  if (existingUser) {
    console.log(`Found existing user ID: ${existingUser.id}. Updating password & email confirmation...`);
    userId = existingUser.id;
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: "Kaushik Savaliya (Master Admin)" },
    });
    if (updateErr) {
      console.error("Failed to update user:", updateErr);
      process.exit(1);
    }
  } else {
    console.log(`User not found. Creating new auth account...`);
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Kaushik Savaliya (Master Admin)" },
    });
    if (createErr) {
      console.error("Failed to create user:", createErr);
      process.exit(1);
    }
    userId = newUser.user.id;
  }

  console.log(`User ID confirmed: ${userId}`);

  // 2. Upsert Profile as Master Admin + Pro Plan + Lifetime Free
  const { error: profErr } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: email,
      business_name: "IntellectFlow Master Admin",
      phone: "+91 7069525795",
      city: "Rajkot",
      is_admin: true,
      plan: "pro",
      plan_price: 1299,
      is_founder_free: true,
      lifetime_free: true,
      subscription_status: "lifetime",
      last_active_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profErr) {
    console.error("Failed to upsert profile:", profErr);
    process.exit(1);
  }

  // 3. Upsert User Role as 'admin'
  const { error: roleErr } = await supabase.from("user_roles").upsert(
    {
      user_id: userId,
      role: "admin",
    },
    { onConflict: "user_id,role" }
  );

  if (roleErr) {
    console.error("Failed to upsert user_roles:", roleErr);
    process.exit(1);
  }

  console.log("✅ DEDICATED MASTER ADMIN USER SUCCESSFULLY CREATED!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Is Admin: true | Plan: Business Pro | Lifetime Free: true`);
}

main().catch(console.error);
