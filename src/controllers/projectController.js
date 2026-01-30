import { prisma } from '../utils/prisma.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';

// Create a new project
export const createProject = async (req, res) => {
    try {
        const { name, description, type } = req.body;
        const userId = req.user.id;

        // Basic validation
        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        const existingProject = await prisma.userProject.findFirst({
            where: {
                owner_id: userId,
                name: name.trim(),
                is_active: true
            }
        });

        if (existingProject) {
            return res.status(400).json({
                success: false,
                message: "You already have a project with this name",
                error: "DUPLICATE_ENTRY"
            });
        }

        // We'll use a transaction if we are creating complex initial data
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create the project shell
            const project = await tx.userProject.create({
                data: {
                    id: uuidv4(),
                    name: name.trim(),
                    description: description?.trim(),
                    owner_id: userId,
                    is_active: true
                }
            });

            // 2. Populate if type is 'example'
            if (type === 'example') {
                const { exampleGTFS } = await import('../utils/exampleData.js');

                // Create Agency
                await tx.agency.create({
                    data: {
                        ...exampleGTFS.agency,
                        project_id: project.id
                    }
                });

                // Create Stops
                for (const stop of exampleGTFS.stops) {
                    await tx.stop.create({
                        data: { ...stop, project_id: project.id }
                    });
                }

                // Create Routes
                for (const route of exampleGTFS.routes) {
                    await tx.route.create({
                        data: { ...route, project_id: project.id }
                    });
                }

                // Create Calendar (Service)
                for (const cal of exampleGTFS.calendar) {
                    await tx.calendar.create({
                        data: { ...cal, project_id: project.id }
                    });
                }

                // Create Trips
                for (const trip of exampleGTFS.trips) {
                    await tx.trip.create({
                        data: { ...trip, project_id: project.id }
                    });
                }

                // Create StopTimes
                for (const st of exampleGTFS.stop_times) {
                    await tx.stopTime.create({
                        data: { ...st, project_id: project.id }
                    });
                }
            }
            // For 'import', we just create the shell projects, upload happens in separate step

            return project;
        });

        res.status(201).json({
            success: true,
            project: result
        });

    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

// Get all projects for the authenticated user
export const getProjects = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;

        const whereClause = {
            owner_id: userId,
            is_active: true,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                ]
            })
        };

        const [projects, totalCount] = await Promise.all([
            prisma.userProject.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { updated_at: "desc" },
                include: {
                    _count: {
                        select: { routes: true, stops: true }
                    },
                    owner: {
                        select: { id: true, username: true, email: true }
                    },
                    shares: {
                        include: {
                            user: {
                                select: { id: true, username: true, email: true }
                            }
                        }
                    }
                }
            }),
            prisma.userProject.count({ where: whereClause })
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: {
                projects,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error("Get Projects Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch projects",
            error: "INTERNAL_ERROR"
        });
    }
};

// Get a single project
export const getProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const project = await prisma.userProject.findFirst({
            where: {
                id,
                OR: [
                    { owner_id: userId },
                    { shares: { some: { user_id: userId } } } // Allow shared access
                ],
                is_active: true
            },
            include: {
                owner: {
                    select: { id: true, username: true, email: true }
                },
                shares: {
                    include: {
                        user: {
                            select: { id: true, username: true, email: true }
                        }
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found",
                error: "NOT_FOUND"
            });
        }

        res.json({
            success: true,
            project
        });
    } catch (error) {
        console.error("Get Project Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch project",
            error: "INTERNAL_ERROR"
        });
    }
};

// Update a project
export const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const userId = req.user.id;

        // Validation
        if (name && name.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Project name must be 100 characters or less",
                error: "BAD_REQUEST"
            });
        }
        if (description && description.length > 500) {
            return res.status(400).json({
                success: false,
                message: "Description must be 500 characters or less",
                error: "BAD_REQUEST"
            });
        }

        // Check ownership or editor permission
        const existingProject = await prisma.userProject.findFirst({
            where: {
                id,
                OR: [
                    { owner_id: userId },
                    { shares: { some: { user_id: userId, role: { in: ['EDITOR', 'OWNER'] } } } }
                ],
                is_active: true
            }
        });

        if (!existingProject) {
            return res.status(404).json({
                success: false,
                message: "Project not found or access denied",
                error: "NOT_FOUND"
            });
        }

        // Duplicate check logic if name changed
        if (name && name.trim() !== existingProject.name) {
            const duplicate = await prisma.userProject.findFirst({
                where: {
                    owner_id: existingProject.owner_id, // Check against owner's projects
                    name: name.trim(),
                    is_active: true,
                    id: { not: id }
                }
            });
            if (duplicate) {
                return res.status(400).json({
                    success: false,
                    message: "Project with this name already exists",
                    error: "DUPLICATE_ENTRY"
                });
            }
        }

        const project = await prisma.userProject.update({
            where: { id },
            data: {
                name: name ? name.trim() : undefined,
                description: description !== undefined ? description?.trim() : undefined
            }
        });

        res.json({
            success: true,
            project
        });
    } catch (error) {
        console.error("Update Project Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update project",
            error: "INTERNAL_ERROR"
        });
    }
};

// Delete a project (Soft Delete)
export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Only OWNER can delete
        const project = await prisma.userProject.findFirst({
            where: {
                id,
                owner_id: userId
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found or you are not the owner",
                error: "NOT_FOUND" // or FORBIDDEN
            });
        }

        // Soft delete
        await prisma.userProject.update({
            where: { id },
            data: { is_active: false }
        });

        res.json({
            success: true,
            message: "Project deleted successfully"
        });
    } catch (error) {
        console.error("Delete Project Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete project",
            error: "INTERNAL_ERROR"
        });
    }
};

// Share a project with another user
export const shareProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, role } = req.body;
        const userId = req.user.id;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
                error: "BAD_REQUEST"
            });
        }

        if (!["EDITOR", "VIEWER"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Must be EDITOR or VIEWER",
                error: "BAD_REQUEST"
            });
        }

        // Check ownership (Only owner can share for now)
        const project = await prisma.userProject.findFirst({
            where: { id, owner_id: userId, is_active: true }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found or you don't have permission to share it",
                error: "NOT_FOUND"
            });
        }

        // Find user to share with
        const userToShare = await prisma.user.findFirst({
            where: { email: email.toLowerCase(), is_active: true }
        });

        if (!userToShare) {
            return res.status(404).json({
                success: false,
                message: "User with this email not found",
                error: "USER_NOT_FOUND"
            });
        }

        if (userToShare.id === userId) {
            return res.status(400).json({
                success: false,
                message: "You cannot share a project with yourself",
                error: "BAD_REQUEST"
            });
        }

        // Check if already shared
        const existingShare = await prisma.projectShare.findFirst({
            where: { project_id: id, user_id: userToShare.id }
        });

        if (existingShare) {
            // Update role if already shared
            const updatedShare = await prisma.projectShare.update({
                where: { id: existingShare.id },
                data: { role }
            });

            return res.json({
                success: true,
                message: "Project access updated",
                share: updatedShare
            });
        }

        // Create new share
        const newShare = await prisma.projectShare.create({
            data: {
                project_id: id,
                user_id: userToShare.id,
                role,
                shared_by: userId
            }
        });

        res.json({
            success: true,
            message: "Project shared successfully",
            share: newShare
        });

    } catch (error) {
        console.error("Share Project Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to share project",
            error: "INTERNAL_ERROR"
        });
    }
};

// Remove access (Unshare)
export const unshareProject = async (req, res) => {
    try {
        const { id, userId: targetUserId } = req.params;
        const userId = req.user.id;

        // Check ownership
        const project = await prisma.userProject.findFirst({
            where: { id, owner_id: userId, is_active: true }
        });

        if (!project) {
            // Allows a user to remove THEMSELVES from a shared project
            const selfRemove = userId === targetUserId;
            if (selfRemove) {
                // Proceed to check if share exists
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Only project owner can remove other users",
                    error: "FORBIDDEN"
                });
            }
        }

        // Find the share record
        const share = await prisma.projectShare.findFirst({
            where: { project_id: id, user_id: targetUserId }
        });

        if (!share) {
            return res.status(404).json({
                success: false,
                message: "User does not have access to this project",
                error: "NOT_FOUND"
            });
        }

        // Delete share
        await prisma.projectShare.delete({
            where: { id: share.id }
        });

        res.json({
            success: true,
            message: "Access removed successfully"
        });

    } catch (error) {
        console.error("Unshare Project Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove access",
            error: "INTERNAL_ERROR"
        });
    }
};

// Import GTFS
export const importGTFS = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            console.error("[DEBUG] No file received in importGTFS");
            return res.status(400).json({
                success: false,
                message: "No file uploaded",
                error: "BAD_REQUEST"
            });
        }

        console.log(`[DEBUG] Received file for import: ${file.originalname} (${file.size} bytes) path: ${file.path}`);

        // Verify project ownership/access
        const project = await prisma.userProject.findFirst({
            where: {
                id,
                OR: [
                    { owner_id: userId },
                    { shares: { some: { user_id: userId, role: { in: ['EDITOR', 'OWNER'] } } } }
                ],
                is_active: true
            }
        });

        if (!project) {
            // Clean up file
            fs.unlinkSync(file.path);
            return res.status(404).json({
                success: false,
                message: "Project not found or access denied",
                error: "NOT_FOUND"
            });
        }

        // Helper to parse CSV buffer
        const parseCSV = (buffer) => {
            return parse(buffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                bom: true
            });
        };

        const zip = new AdmZip(file.path);
        const zipEntries = zip.getEntries();
        console.log(`[DEBUG] ZIP Entries found: ${zipEntries.length}`);

        const files = {};
        zipEntries.forEach(entry => {
            // Normalize path: ignore directory structure, just get filename
            // Also handle potential case differences or macos __MACOSX garbage
            if (entry.isDirectory || entry.entryName.startsWith('__MACOSX')) return;

            const fileName = entry.entryName.split('/').pop().toLowerCase();
            if (fileName.endsWith('.txt')) {
                console.log(`[DEBUG] Found valid GTFS file: ${fileName} (original: ${entry.entryName})`);
                files[fileName] = entry.getData();
            }
        });

        // Use transaction for atomicity
        await prisma.$transaction(async (tx) => {
            // 1. Parse Agency
            if (files['agency.txt']) {
                const agencies = parseCSV(files['agency.txt']);
                for (const agency of agencies) {
                    await tx.agency.create({
                        data: {
                            project_id: id,
                            agency_id: agency.agency_id || uuidv4(),
                            agency_name: agency.agency_name,
                            agency_url: agency.agency_url,
                            agency_timezone: agency.agency_timezone,
                            agency_lang: agency.agency_lang,
                            agency_phone: agency.agency_phone,
                            agency_email: agency.agency_email,
                        }
                    });
                }
            }

            // 2. Parse Stops
            if (files['stops.txt']) {
                const stops = parseCSV(files['stops.txt']);

                // Separate stops into parents (no parent_station) and children (has parent_station)
                const parentStops = stops.filter(s => !s.parent_station);
                const childStops = stops.filter(s => s.parent_station);

                const createStop = async (stop) => {
                    if (stop.stop_lat && stop.stop_lon) {
                        await tx.stop.create({
                            data: {
                                project_id: id,
                                stop_id: stop.stop_id,
                                stop_code: stop.stop_code,
                                stop_name: stop.stop_name,
                                stop_desc: stop.stop_desc,
                                stop_lat: parseFloat(stop.stop_lat),
                                stop_lon: parseFloat(stop.stop_lon),
                                zone_id: stop.zone_id,
                                stop_url: stop.stop_url,
                                location_type: stop.location_type ? parseInt(stop.location_type) : 0,
                                parent_station: stop.parent_station || null
                            }
                        });
                    }
                };

                // Insert parents first
                for (const stop of parentStops) {
                    await createStop(stop);
                }

                // Insert children second
                for (const stop of childStops) {
                    await createStop(stop);
                }
            }

            // 3. Parse Routes
            if (files['routes.txt']) {
                const routes = parseCSV(files['routes.txt']);
                for (const route of routes) {
                    await tx.route.create({
                        data: {
                            project_id: id,
                            route_id: route.route_id,
                            agency_id: route.agency_id, // Note: Might need to validate if agency exists or be lenient
                            route_short_name: route.route_short_name,
                            route_long_name: route.route_long_name,
                            route_desc: route.route_desc,
                            route_type: parseInt(route.route_type),
                            route_url: route.route_url,
                            route_color: route.route_color,
                            route_text_color: route.route_text_color
                        }
                    });
                }
            }

            // 4. Parse Calendar (Service)
            if (files['calendar.txt']) {
                const calendars = parseCSV(files['calendar.txt']);
                for (const cal of calendars) {
                    await tx.calendar.create({
                        data: {
                            project_id: id,
                            service_id: cal.service_id,
                            monday: parseInt(cal.monday),
                            tuesday: parseInt(cal.tuesday),
                            wednesday: parseInt(cal.wednesday),
                            thursday: parseInt(cal.thursday),
                            friday: parseInt(cal.friday),
                            saturday: parseInt(cal.saturday),
                            sunday: parseInt(cal.sunday),
                            start_date: cal.start_date,
                            end_date: cal.end_date
                        }
                    });
                }
            }

            // 5. Parse Trips
            if (files['trips.txt']) {
                const trips = parseCSV(files['trips.txt']);
                // Optimization: create many can be faster but prisma createMany doesn't support relation connections easily unless IDs are exact
                // For now, loop is safer for relational integrity checks if we added them, but slow.
                // Let's use loop for MVP safety.
                for (const trip of trips) {
                    await tx.trip.create({
                        data: {
                            project_id: id,
                            route_id: trip.route_id,
                            service_id: trip.service_id,
                            trip_id: trip.trip_id,
                            trip_headsign: trip.trip_headsign,
                            trip_short_name: trip.trip_short_name,
                            direction_id: trip.direction_id ? parseInt(trip.direction_id) : null,
                            block_id: trip.block_id,
                            shape_id: trip.shape_id
                        }
                    });
                }
            }

            // 6. Parse Stop Times - This is usually the largest file, might be slow!
            // Optimizations: Use createMany if possible.
            if (files['stop_times.txt']) {
                const stopTimes = parseCSV(files['stop_times.txt']);

                // Chunking for stop_times import to avoid memory/timeout issues
                const chunkSize = 1000;
                for (let i = 0; i < stopTimes.length; i += chunkSize) {
                    const chunk = stopTimes.slice(i, i + chunkSize);

                    await tx.stopTime.createMany({
                        data: chunk.map(st => ({
                            project_id: id,
                            trip_id: st.trip_id,
                            arrival_time: st.arrival_time,
                            departure_time: st.departure_time,
                            stop_id: st.stop_id,
                            stop_sequence: parseInt(st.stop_sequence),
                            stop_headsign: st.stop_headsign,
                            pickup_type: st.pickup_type ? parseInt(st.pickup_type) : 0,
                            drop_off_type: st.drop_off_type ? parseInt(st.drop_off_type) : 0,
                            shape_dist_traveled: st.shape_dist_traveled ? parseFloat(st.shape_dist_traveled) : null
                        }))
                    });
                }
            }
        }, {
            timeout: 60000 // Increase timeout to 60s
        });

        // Clean up file
        fs.unlinkSync(file.path);

        res.status(200).json({
            success: true,
            message: "GTFS data imported successfully"
        });

    } catch (error) {
        console.error("Import GTFS Error:", error);
        // Clean up file if error
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
        res.status(500).json({
            success: false,
            message: "Failed to import GTFS data: " + error.message,
            error: "INTERNAL_ERROR",
            debug: error.toString()
        });
    }
};

// Get stops for a project
export const getStops = async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const userId = req.user.id;

        // Verify project access
        const project = await prisma.userProject.findFirst({
            where: {
                id,
                OR: [
                    { owner_id: userId },
                    { shares: { some: { user_id: userId } } }
                ],
                is_active: true
            }
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found or access denied",
                error: "NOT_FOUND"
            });
        }

        const skip = (page - 1) * limit;
        const whereClause = {
            project_id: id,
            ...(search && {
                OR: [
                    { stop_name: { contains: search, mode: "insensitive" } },
                    { stop_id: { contains: search, mode: "insensitive" } },
                    { stop_desc: { contains: search, mode: "insensitive" } },
                ]
            })
        };

        const [stops, totalCount] = await Promise.all([
            prisma.stop.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { stop_id: "asc" }
            }),
            prisma.stop.count({ where: whereClause })
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: {
                stops,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error("Get Stops Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stops",
            error: "INTERNAL_ERROR"
        });
    }
};
