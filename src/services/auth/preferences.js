// app/api/auth/preferences/route.js
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  handleCORS,
  addCORSHeaders,
  requireAuth,
  handleAPIError,
  validateRequestBody,
} from "@/middleware/auth"

export async function OPTIONS(request) {
  return handleCORS(request)
}

export async function GET(request) {
  try {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      return addCORSHeaders(authResult)
    }

    const { user } = authResult

    // Get user preferences
    const preferences = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
    })

    const response = NextResponse.json({
      success: true,
      data: { preferences },
    })

    return addCORSHeaders(response)
  } catch (error) {
    return addCORSHeaders(handleAPIError(error, "get user preferences"))
  }
}

export async function PUT(request) {
  try {
    const authResult = await requireAuth(request)

    if (authResult instanceof NextResponse) {
      return addCORSHeaders(authResult)
    }

    const { user } = authResult

    // Validate request body
    const validationResult = await validateRequestBody(request, {
      fields: {
        theme: "string",
        language: "string",
        timezone: "string",
        map_default_lat: "number",
        map_default_lon: "number",
        map_default_zoom: "number",
        table_page_size: "number",
        notifications: "boolean",
      },
    })

    if (validationResult instanceof NextResponse) {
      return validationResult
    }

    const { body } = validationResult
    const updateData = {}

    // Validate theme
    if (body.theme && !["light", "dark", "system"].includes(body.theme)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid theme. Must be light, dark, or system",
          error: "INVALID_THEME",
        },
        { status: 400 }
      )
    }

    // Validate map coordinates
    if (body.map_default_lat !== undefined) {
      if (body.map_default_lat < -90 || body.map_default_lat > 90) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid latitude. Must be between -90 and 90",
            error: "INVALID_LATITUDE",
          },
          { status: 400 }
        )
      }
      updateData.map_default_lat = body.map_default_lat
    }

    if (body.map_default_lon !== undefined) {
      if (body.map_default_lon < -180 || body.map_default_lon > 180) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid longitude. Must be between -180 and 180",
            error: "INVALID_LONGITUDE",
          },
          { status: 400 }
        )
      }
      updateData.map_default_lon = body.map_default_lon
    }

    // Validate zoom level
    if (body.map_default_zoom !== undefined) {
      if (body.map_default_zoom < 1 || body.map_default_zoom > 20) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid zoom level. Must be between 1 and 20",
            error: "INVALID_ZOOM",
          },
          { status: 400 }
        )
      }
      updateData.map_default_zoom = body.map_default_zoom
    }

    // Validate page size
    if (body.table_page_size !== undefined) {
      if (body.table_page_size < 5 || body.table_page_size > 100) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid page size. Must be between 5 and 100",
            error: "INVALID_PAGE_SIZE",
          },
          { status: 400 }
        )
      }
      updateData.table_page_size = body.table_page_size
    }

    // Add other valid fields
    const validFields = ["theme", "language", "timezone", "notifications"]
    validFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    // Update preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { user_id: user.id },
      update: {
        ...updateData,
        updated_at: new Date(),
      },
      create: {
        user_id: user.id,
        ...updateData,
      },
    })

    const response = NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
      data: { preferences },
    })

    return addCORSHeaders(response)
  } catch (error) {
    return addCORSHeaders(handleAPIError(error, "update user preferences"))
  }
}
