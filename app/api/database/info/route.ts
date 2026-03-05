import { NextResponse } from 'next/server'

/**
 * GET /api/database/info
 *
 * Returns the database host and name parsed from DATABASE_URL.
 * Does NOT expose credentials.
 */
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL ?? ''

  let host = 'Unknown'
  let dbName = 'Unknown'

  try {
    const url = new URL(databaseUrl)
    host = url.hostname
    // The database name is the first path segment (remove leading slash)
    const rawPath = url.pathname.replace(/^\//, '')
    dbName = rawPath.length > 0 ? rawPath : 'Unknown'
  } catch {
    // URL parse failed
  }

  return NextResponse.json({ host, dbName })
}
