import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { eq } from "drizzle-orm";
import { db, supabase, getUserFromToken } from "./supabase.js";
import { users } from "../../drizzle/schema.js";

/**
 * =========================================================
 * tRPC Context Creator (Supabase Auth)
 * =========================================================
 * - Reads Bearer token from Authorization header
 * - Verifies token with Supabase
 * - Finds matching DB user via auth_id
 * - Injects user + db + supabase into context
 * =========================================================
 */

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions) {
  const authHeader = req.headers.authorization;

  // Expected format:
  // Authorization: Bearer <access_token>
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "")
      : null;

  // Default unauthenticated context
  if (!token) {
    return {
      user: null,
      db,
      supabase,
      req,
      res,
    };
  }

  try {
    // Validate JWT with Supabase
    const supabaseUser = await getUserFromToken(token);

    if (!supabaseUser) {
      return {
        user: null,
        db,
        supabase,
        req,
        res,
      };
    }

    // Find linked local user record
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.auth_id, supabaseUser.id))
      .limit(1);

    if (!dbUser) {
      return {
        user: null,
        db,
        supabase,
        req,
        res,
      };
    }

    // Authenticated context
    return {
      user: {
        id: dbUser.id,
        auth_id: dbUser.auth_id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      },
      db,
      supabase,
      req,
      res,
    };
  } catch (error) {
    console.error("Auth context error:", error);

    return {
      user: null,
      db,
      supabase,
      req,
      res,
    };
  }
}

/**
 * Context type for use throughout tRPC routers
 */
export type Context = Awaited<ReturnType<typeof createContext>>;
