import fs from "fs"
import { prisma } from "./src/utils/prisma.js"
import * as gtfsService from "./src/services/gtfs/index.js"

async function run() {
  try {
    const userId = ""
    const projectId = ""
    const filePath = "./public/transjakarta.zip"

    console.log("🚀 Starting ingestion with verified IDs...")

    const buffer = fs.readFileSync(filePath)
    const result = await gtfsService.uploadGTFS(
      userId,
      projectId,
      buffer,
      "transjakarta.zip",
    )

    console.log("✅ Success:", result)
  } catch (error) {
    console.error("❌ Critical Error:", error.message)
    // This will print the full error if it's still a Prisma error
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}
run()
