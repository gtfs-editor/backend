import { NextResponse } from "next/server"
import { PrismaClient } from "@/prisma/client"

const prisma = new PrismaClient()
const PAGE_SIZE = 10

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  // console.log("Fetching stops with searchParams:", searchParams.toString())
  const page = parseInt(searchParams.get("page") || "1", 10)
  const search = searchParams.get("search") || ""

  if (isNaN(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page number" }, { status: 400 })
  }

  try {
    const skip = (page - 1) * PAGE_SIZE
    let total, stops

    if (search) {
      // Use Prisma's built-in search capabilities for consistency
      const whereClause = {
        OR: [
          { stop_name: { contains: search, mode: "insensitive" } },
          { stop_id: { contains: search, mode: "insensitive" } },
          { stop_desc: { contains: search, mode: "insensitive" } },
        ],
      }

      // Count total matching records
      total = await prisma.stop.count({ where: whereClause })

      // Get paginated results
      stops = await prisma.stop.findMany({
        where: whereClause,
        orderBy: { stop_id: "asc" },
        skip: skip,
        take: PAGE_SIZE,
      })
    } else {
      // For non-search queries, use regular Prisma methods
      total = await prisma.stop.count()
      stops = await prisma.stop.findMany({
        skip: skip,
        take: PAGE_SIZE,
        orderBy: [{ stop_id: "asc" }],
      })
    }

    const meta = {
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
      totalItems: total,
      search: search,
      hasNextPage: page < Math.ceil(total / PAGE_SIZE),
      hasPreviousPage: page > 1,
    }

    return NextResponse.json({
      success: true,
      data: {
        stops: stops,
      },
      meta,
    })
  } catch (error) {
    // console.error("❌ Failed to fetch stops:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stops",
        message: error.message,
      },
      { status: 500 }
    )
  }
}
