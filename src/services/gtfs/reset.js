import { prisma } from "../../utils/prisma.js"
import { checkProjectAccess } from "../../utils/auth.js"

// Reset GTFS Data
export async function resetGTFS(userId, projectId) {
    if (projectId) {
        // Reset only for this project
        // Clean using project_id
        const access = await checkProjectAccess(userId, projectId, "OWNER");
        if (!access.hasAccess) throw new Error("Access Denied");

        await prisma.stopTime.deleteMany({ where: { project_id: projectId } })
        await prisma.trip.deleteMany({ where: { project_id: projectId } })
        await prisma.fareRule.deleteMany({ where: { project_id: projectId } })
        await prisma.fareAttribute.deleteMany({ where: { project_id: projectId } })
        await prisma.calendarDate.deleteMany({ where: { project_id: projectId } })
        await prisma.calendar.deleteMany({ where: { project_id: projectId } })
        await prisma.route.deleteMany({ where: { project_id: projectId } })
        await prisma.stop.deleteMany({ where: { project_id: projectId } })
        await prisma.agency.deleteMany({ where: { project_id: projectId } })
        await prisma.shape.deleteMany({ where: { project_id: projectId } })
    } else {
        throw new Error("Project ID is required to reset GTFS data")
    }

    return { message: "GTFS data reset successfully for project" }
}
