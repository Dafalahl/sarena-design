import { NextResponse } from 'next/server'

// Xendit Integration is Hibernated. Fully using Pakasir Escrow instead.
export async function POST(request) {
  return NextResponse.json({ 
    status: 'hibernated', 
    message: 'Xendit integration is disabled. Sarena has fully transitioned to Pakasir payments.' 
  })
}
