import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../../drizzle/schema.js";

/**
 * =========================================================
 * Supabase Client (Auth + Admin Operations)
 * =========================================================
 * Uses SERVICE ROLE KEY.
 * IMPORTANT: Never expose this key to the frontend.
 */
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * =========================================================
 * PostgreSQL Connection (Supabase Database)
 * =========================================================
 * Uses DATABASE_URL from Supabase settings.
 */
const queryClient = postgres(process.env.DATABASE_URL!, {
  ssl: "require", // Required for Supabase hosted Postgres
});

/**
 * Drizzle ORM instance connected to Supabase Postgres
 */
export const db = drizzle(queryClient, {
  schema,
});

/**
 * =========================================================
 * Helper: Validate Supabase JWT Token
 * =========================================================
 * Used in tRPC context to authenticate Bearer tokens.
 */
export async function getUserFromToken(token: string) {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  } catch (err) {
    console.error("Supabase token verification error:", err);
    return null;
  }
}
