// app/api/auth/sessions/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  handleCORS,
  addCORSHeaders,
  requireAuth,
  handleAPIError,
  getClientIP,
} from "@/middleware/auth"

export async function OPTIONS(request) {
  return handleCORS(request)
}

// Get all active sessions for current user
export async function GET(request) {
  try {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      return addCORSHeaders(authResult)
    }

    const { user } = authResult

    // Get all active sessions
    const sessions = await prisma.userSession.findMany({
      where: {
        user_id: user.id,
        expires_at: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        user_agent: true,
        ip_address: true,
        created_at: true,
        last_active: true,
        expires_at: true,
      },
      orderBy: {
        last_active: "desc",
      },
    })

    // Mark current session
    const currentToken = request.headers.get("authorization")?.slice(7)
    const sessionsWithCurrent = sessions.map((session) => ({
      ...session,
      is_current: session.session_token === currentToken,
    }))

    const response = NextResponse.json({
      success: true,
      data: { sessions: sessionsWithCurrent },
    })

    return addCORSHeaders(response)
  } catch (error) {
    return addCORSHeaders(handleAPIError(error, "get user sessions"))
  }
}

// app/api/auth/sessions/[sessionId]/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  handleCORS,
  addCORSHeaders,
  requireAuth,
  handleAPIError,
} from "@/middleware/auth"

export async function OPTIONS(request) {
  return handleCORS(request)
}

// Revoke a specific session
export async function DELETE(request, { params }) {
  try {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      return addCORSHeaders(authResult)
    }

    const { user } = authResult
    const { sessionId } = params

    // Check if session belongs to user
    const session = await prisma.userSession.findFirst({
      where: {
        id: sessionId,
        user_id: user.id,
      },
    })

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Session not found",
          error: "SESSION_NOT_FOUND",
        },
        { status: 404 }
      )
    }

    // Delete the session
    await prisma.userSession.delete({
      where: { id: sessionId },
    })

    const response = NextResponse.json({
      success: true,
      message: "Session revoked successfully",
    })

    return addCORSHeaders(response)
  } catch (error) {
    return addCORSHeaders(handleAPIError(error, "revoke session"))
  }
}

// app/api/auth/sessions/revoke-all/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  handleCORS,
  addCORSHeaders,
  requireAuth,
  handleAPIError,
} from "@/middleware/auth"

export async function OPTIONS(request) {
  return handleCORS(request)
}

// Revoke all sessions except current
export async function POST(request) {
  try {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      return addCORSHeaders(authResult)
    }

    const { user } = authResult
    const currentToken = request.headers.get("authorization")?.slice(7)

    // Delete all sessions except current
    const result = await prisma.userSession.deleteMany({
      where: {
        user_id: user.id,
        session_token: {
          not: currentToken,
        },
      },
    })

    const response = NextResponse.json({
      success: true,
      message: `${result.count} sessions revoked successfully`,
    })

    return addCORSHeaders(response)
  } catch (error) {
    return addCORSHeaders(handleAPIError(error, "revoke all sessions"))
  }
}

// app/api/auth/refresh/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateToken, sanitizeUser } from "@/lib/auth"
import {
  handleCORS,
  addCORSHeaders,
  requireAuth,
  handleAPIError,
  getClientIP,
} from "@/middleware/auth"

export async function OPTIONS(request) {
  return handleCORS(request)
}

// Refresh user token
export async function POST(request) {
  try {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      return addCORSHeaders(authResult)
    }

    const { user } = authResult
    const currentToken = request.headers.get("authorization")?.slice(7)

    // Find current session
    const currentSession = await prisma.userSession.findFirst({
      where: {
        user_id: user.id,
        session_token: currentToken,
      },
    })

    if (!currentSession) {
      return NextResponse.json(
        {
          success: false,
          message: "Session not found",
          error: "SESSION_NOT_FOUND",
        },
        { status: 401 }
      )
    }

    // Generate new token
    const newToken = generateToken(user)

    // Update session with new token and extend expiry
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await prisma.userSession.update({
      where: { id: currentSession.id },
      data: {
        session_token: newToken,
        expires_at: newExpiresAt,
        last_active: new Date(),
      },
    })

    // Get fresh user data
    const freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        preferences: true,
      },
    })

    const response = NextResponse.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        user: sanitizeUser(freshUser),
        token: newToken,
        expires_at: newExpiresAt,
      },
    })

    return addCORSHeaders(response)
  } catch (error) {
    return addCORSHeaders(handleAPIError(error, "refresh token"))
  }
}
