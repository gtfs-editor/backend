import JSZip from "jszip"
import { parse } from "csv-parse/sync"
import { prisma } from "../../utils/prisma.js"
import { appendFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"
import { checkProjectAccess } from "../../utils/auth.js"

// Configuration
const CONFIG = {
    LOG_DIR: "./dump",
    CHUNK_SIZE: 500,
    MAX_LOG_IDS: 5,
}

// GTFS table configuration with metadata
const GTFS_TABLES = {
    agency: { model: "agency", primaryKey: "agency_id" },
    stops: { model: "stop", primaryKey: "stop_id" },
    routes: { model: "route", primaryKey: "route_id" },
    calendar: { model: "calendar", primaryKey: "service_id" },
    calendar_dates: { model: "calendarDate", primaryKey: null },
    trips: { model: "trip", primaryKey: "trip_id" },
    stop_times: { model: "stopTime", primaryKey: null },
    shapes: { model: "shape", primaryKey: null },
}

const IMPORT_ORDER = [
    "agency",
    "stops",
    "routes",
    "calendar",
    "calendar_dates",
    "trips",
    "stop_times",
    "shapes",
]

class GTFSUploadProcessor {
    constructor(userId, projectId) {
        this.userId = userId
        this.projectId = projectId
        this.logFile = this.generateLogFile()
        this.referenceIds = new Map()
        this.importedTables = []
        this.failedTables = []
        this.loggedIds = {}
    }

    generateLogFile() {
        const logTime = new Date()
            .toISOString()
            .replace(/[-:]/g, "")
            .replace(/\..+/, "")
        // Ensure LOG_DIR exists relative to process.cwd()
        return join(process.cwd(), CONFIG.LOG_DIR, `gtfs_debug_${this.userId}_${logTime}.log`)
    }

    async logToFile(content) {
        try {
            await mkdir(join(process.cwd(), CONFIG.LOG_DIR), { recursive: true })
            await appendFile(this.logFile, `${content}\n`)
        } catch (err) {
            console.error("❌ Failed to write log file:", err)
        }
    }

    // Type conversion utilities
    toInt = (v) => (v === "" || v == null ? null : parseInt(v, 10))
    toFloat = (v) => (v === "" || v == null ? null : parseFloat(v))
    toNull = (v) => (v === "" ? null : v)

    normalizeRecord(model, record) {
        // First, set any empty strings to null for all records
        const normalized = { ...record }
        for (const key in normalized) {
            if (normalized[key] === "") {
                normalized[key] = null
            }
        }

        // Add user context fields to all records
        normalized.project_id = this.projectId
        normalized.created_by = this.userId

        const normalizers = {
            stop: () => {
                let lat = normalized.stop_lat
                let lon = normalized.stop_lon

                if (typeof lat === "string") lat = lat.replace(",", ".")
                if (typeof lon === "string") lon = lon.replace(",", ".")

                normalized.stop_lat = this.toFloat(lat)
                normalized.stop_lon = this.toFloat(lon)

                return {
                    ...normalized,
                    location_type: this.toInt(normalized.location_type),
                    wheelchair_boarding: this.toInt(normalized.wheelchair_boarding),
                }
            },
            route: () => ({
                ...normalized,
                route_type: this.toInt(normalized.route_type),
                route_sort_order: this.toInt(normalized.route_sort_order),
            }),
            trip: () => ({
                ...normalized,
                direction_id: this.toInt(normalized.direction_id),
                wheelchair_accessible: this.toInt(normalized.wheelchair_accessible),
                bikes_allowed: this.toInt(normalized.bikes_allowed),
            }),
            stopTime: () => ({
                ...normalized,
                stop_sequence: this.toInt(normalized.stop_sequence),
                pickup_type: this.toInt(normalized.pickup_type),
                drop_off_type: this.toInt(normalized.drop_off_type),
                shape_dist_traveled: this.toFloat(normalized.shape_dist_traveled),
                timepoint: this.toInt(normalized.timepoint),
            }),
            calendar: () => ({
                ...normalized,
                monday: this.toInt(normalized.monday),
                tuesday: this.toInt(normalized.tuesday),
                wednesday: this.toInt(normalized.wednesday),
                thursday: this.toInt(normalized.thursday),
                friday: this.toInt(normalized.friday),
                saturday: this.toInt(normalized.saturday),
                sunday: this.toInt(normalized.sunday),
            }),
            calendarDate: () => ({
                ...normalized,
                exception_type: this.toInt(normalized.exception_type),
            }),
            shape: () => ({
                ...normalized,
                shape_pt_lat: this.toFloat(normalized.shape_pt_lat),
                shape_pt_lon: this.toFloat(normalized.shape_pt_lon),
                shape_pt_sequence: this.toInt(normalized.shape_pt_sequence),
                shape_dist_traveled: this.toFloat(normalized.shape_dist_traveled),
            }),
        }

        return normalizers[model] ? normalizers[model]() : normalized
    }

    async loadExistingIds() {
        const queries = [
            { key: "agencyIds", sql: `SELECT agency_id FROM "Agency" WHERE project_id = $1` },
            { key: "stopIds", sql: `SELECT stop_id FROM "Stop" WHERE project_id = $1` },
            { key: "routeIds", sql: `SELECT route_id FROM "Route" WHERE project_id = $1` },
            { key: "tripIds", sql: `SELECT trip_id FROM "Trip" WHERE project_id = $1` },
            { key: "serviceIds", sql: `SELECT service_id FROM "Calendar" WHERE project_id = $1 UNION SELECT service_id FROM "CalendarDate" WHERE project_id = $1` },
        ]

        for (const { key, sql } of queries) {
            try {
                const result = await prisma.$queryRawUnsafe(sql, this.projectId)
                const ids = new Set(result.map((r) => r[Object.keys(r)[0]]))
                this.referenceIds.set(key, ids)
                await this.logToFile(`🔍 Loaded ${ids.size} existing ${key} for project ${this.projectId}.`)
            } catch (error) {
                await this.logToFile(`⚠️ Failed to load existing ${key}: ${error.message}`)
                this.referenceIds.set(key, new Set())
            }
        }
    }

    async updateReferenceIds(model, records, primaryKey) {
        if (!primaryKey) return

        const modelToKeyMap = {
            agency: "agencyIds",
            stop: "stopIds",
            route: "routeIds",
            trip: "tripIds",
            calendar: "serviceIds",
            calendarDate: "serviceIds",
        }

        const keyName = modelToKeyMap[model]
        if (!keyName) return

        const idSet = this.referenceIds.get(keyName) || new Set()
        const idField = model === "calendarDate" ? "service_id" : primaryKey

        records.forEach((record) => {
            if (record[idField]) {
                idSet.add(record[idField])
            }
        })
        this.referenceIds.set(keyName, idSet)
    }

    filterRecordsByDependencies(model, records) {
        const filters = {
            route: (r) => this.referenceIds.get("agencyIds").has(r.agency_id),
            trip: (r) =>
                this.referenceIds.get("routeIds").has(r.route_id) &&
                this.referenceIds.get("serviceIds").has(r.service_id),
            stopTime: (r) =>
                this.referenceIds.get("tripIds").has(r.trip_id) &&
                this.referenceIds.get("stopIds").has(r.stop_id),
        }

        if (!filters[model]) return records

        const filtered = records.filter(filters[model])

        if (filtered.length < records.length) {
            this.logToFile(
                `⚠️ ${model}: ${records.length - filtered.length} records filtered due to missing dependencies.`
            )
        }
        return filtered
    }

    async processStopsHierarchically(records) {
        const stopsWithoutParent = records.filter((stop) => !stop.parent_station)
        const stopsWithParent = records.filter((stop) => stop.parent_station)
        let totalInserted = 0

        try {
            if (stopsWithoutParent.length > 0) {
                await this.logToFile(`\n--- Inserting ${stopsWithoutParent.length} stops without parents... ---`)
                totalInserted += await this.insertChunked("stop", "stop_id", stopsWithoutParent)
            }

            if (stopsWithParent.length > 0) {
                await this.logToFile(`\n--- Inserting ${stopsWithParent.length} stops with parents... ---`)
                totalInserted += await this.insertChunked("stop", "stop_id", stopsWithParent)
            }
        } catch (error) {
            await this.logToFile(`❌ A critical error occurred during hierarchical stop processing.`)
            throw error
        }
        return totalInserted
    }

    async insertChunked(model, primaryKey, records) {
        const prismaModel = prisma[model]
        const chunks = Array.from(
            { length: Math.ceil(records.length / CONFIG.CHUNK_SIZE) },
            (_, i) => records.slice(i * CONFIG.CHUNK_SIZE, i * CONFIG.CHUNK_SIZE + CONFIG.CHUNK_SIZE)
        )

        let totalInserted = 0
        for (const chunk of chunks) {
            try {
                let finalChunk = chunk
                if (primaryKey) {
                    const uniqueRecords = new Map()
                    chunk.forEach((record) => {
                        if (record[primaryKey]) uniqueRecords.set(record[primaryKey], record)
                    })
                    finalChunk = Array.from(uniqueRecords.values())
                }

                if (finalChunk.length === 0) continue

                const result = await prismaModel.createMany({
                    data: finalChunk,
                    skipDuplicates: true,
                })

                totalInserted += result.count
                await this.updateReferenceIds(model, finalChunk, primaryKey)

                if (primaryKey) {
                    // Basic logging logic
                }
            } catch (error) {
                const errorMessage = error?.meta?.cause || error.message || "Unknown error"
                await this.logToFile(`❌ Failed to insert ${model} chunk: ${errorMessage}`)
            }
        }
        return totalInserted
    }

    async processTable(tableName, zip) {
        const tableConfig = GTFS_TABLES[tableName]
        const filePath = `${tableName}.txt`

        if (!zip.files[filePath]) {
            const optionalFiles = ["calendar.txt", "calendar_dates.txt", "shapes.txt"]
            if (!optionalFiles.includes(filePath)) {
                await this.logToFile(`❌ Required file ${filePath} not found in zip.`)
                this.failedTables.push(tableConfig.model)
            }
            return
        }

        try {
            const content = await zip.file(filePath).async("string")
            const rawRecords = parse(content, { columns: true, skip_empty_lines: true, trim: true })

            if (!rawRecords.length) {
                await this.logToFile(`- ${tableName}: No records found, skipping.`)
                return
            }

            const normalizedRecords = rawRecords.map((record) => this.normalizeRecord(tableConfig.model, record))
            const filteredRecords = this.filterRecordsByDependencies(tableConfig.model, normalizedRecords)

            if (!filteredRecords.length) {
                await this.logToFile(`- ${tableName}: No valid records after dependency filtering, skipping.`)
                return
            }

            let totalInserted = 0
            if (tableConfig.model === "stop") {
                totalInserted = await this.processStopsHierarchically(filteredRecords)
            } else {
                totalInserted = await this.insertChunked(tableConfig.model, tableConfig.primaryKey, filteredRecords)
            }

            await this.logToFile(`✅ ${tableConfig.model}: ${totalInserted} records processed.`)
            this.importedTables.push(tableConfig.model)
        } catch (error) {
            this.failedTables.push(tableConfig.model)
            await this.logToFile(`❌ Error processing ${tableName}: ${error.message}`)
        }
    }

    async process(zipBuffer) {
        await this.logToFile(`🚀 Starting GTFS upload process for user ${this.userId}, project ${this.projectId}`)
        try {
            const zip = await JSZip.loadAsync(zipBuffer)
            await this.loadExistingIds()

            for (const tableName of IMPORT_ORDER) {
                await this.logToFile(`\n--- Processing table: ${tableName} ---`)
                await this.processTable(tableName, zip)
            }

            await this.logToFile("\n🎉 GTFS upload process completed.")
            return {
                status: "success",
                tables: this.importedTables,
                failedTables: this.failedTables,
                logFile: this.logFile,
            }
        } catch (error) {
            await this.logToFile(`❌ CRITICAL ERROR: ${error.stack || error.message}`)
            return { status: "error", message: error.message, logFile: this.logFile }
        }
    }
}

/**
 * Uploads GTFS file to a project (or creates a new one).
 */
export async function uploadGTFS(userId, projectId, buffer, fileName) {
    // Check if project exists or needs creation
    let targetProjectId = projectId;

    if (!projectId) {
        // Create auto project
        const project = await createAutoProject(userId, fileName);
        targetProjectId = project.id;
    } else {
        // Verify access
        const access = await checkProjectAccess(userId, projectId, "EDITOR");
        if (!access.hasAccess) {
            // If access denied, create new one instead? Or error?
            // Next.js version created new one if "not found or no access"
            const project = await createAutoProject(userId, fileName);
            targetProjectId = project.id;
        } else {
            targetProjectId = access.project.id;
        }
    }

    const processor = new GTFSUploadProcessor(userId, targetProjectId);
    const result = await processor.process(buffer);

    if (result.status === "error") {
        throw new Error(result.message);
    }

    return {
        message: "GTFS data uploaded successfully",
        project: {
            id: targetProjectId,
            // fetch name/desc if needed, or assume from context
        },
        ...result
    };
}

async function createAutoProject(userId, fileName) {
    const projectName = `GTFS Upload - ${fileName}`.replace(".zip", "")
    const projectDescription = `Automatically created project for GTFS upload on ${new Date().toLocaleString()}`

    return await prisma.userProject.create({
        data: {
            id: uuidv4(),
            name: projectName,
            description: projectDescription,
            owner_id: userId,
            is_active: true,
        },
    })
}
