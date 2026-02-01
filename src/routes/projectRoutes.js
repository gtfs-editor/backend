import express from 'express';
import {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    shareProject,
    unshareProject
} from '../controllers/projectController.js';
import {
    uploadGTFS,
    resetGTFS,
    // Stops
    getStops,
    getStopById,
    createStop,
    updateStop,
    deleteStop,
    searchStops,
    getStopsNearby,
    // Routes
    getRoutes,
    getRouteById,
    getRouteDetails,
    createRoute,
    updateRoute,
    deleteRoute,
    // Route Stops Management
    getRouteStops,
    assignStopsToRoute,
    clearRouteStops,
    addStopToRoute,
    removeStopFromRoute,
    reorderRouteStops,
    // Trips
    getTrips,
    getTripById,
    createTrip,
    updateTrip,
    // Calendar
    getCalendar,
    createCalendar,
    updateCalendar,
    // Fares
    getFares,
    createFare,
    updateFare,
    // Agencies
    getAgencies
} from '../controllers/gtfsController.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Project CRUD
router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Sharing
router.post('/:id/share', shareProject);
router.delete('/:id/share/:userId', unshareProject);

// Middleware to map params.id to body.project_id and query.project_id
const mapProjectId = (req, res, next) => {
    if (req.params.id) {
        // Set project_id in body for POST/PUT requests
        if (!req.body) req.body = {};
        req.body.project_id = req.params.id;

        // Set project_id in query for GET requests
        if (!req.query) req.query = {};
        req.query.project_id = req.params.id;
    }
    next();
};

// GTFS Import/Reset
router.post('/:id/import', upload.single('file'), mapProjectId, uploadGTFS);
router.post('/:id/reset', mapProjectId, resetGTFS);

// ============ STOPS ============
router.get('/:id/stops', mapProjectId, getStops);
router.get('/:id/stops/search', mapProjectId, searchStops);
router.get('/:id/stops/nearby', mapProjectId, getStopsNearby);
router.get('/:id/stops/:stopId', mapProjectId, getStopById);
router.post('/:id/stops', mapProjectId, createStop);
router.put('/:id/stops/:stopId', mapProjectId, updateStop);
router.delete('/:id/stops/:stopId', mapProjectId, deleteStop);

// ============ ROUTES ============
router.get('/:id/routes', mapProjectId, getRoutes);
router.get('/:id/routes/:routeId', mapProjectId, getRouteDetails);
router.post('/:id/routes', mapProjectId, createRoute);
router.put('/:id/routes/:routeId', mapProjectId, updateRoute);
router.delete('/:id/routes/:routeId', mapProjectId, deleteRoute);

// ============ ROUTE STOPS MANAGEMENT ============
// Get stops for a route (all directions or specific direction)
router.get('/:id/routes/:routeId/stops', mapProjectId, getRouteStops);

// Assign/replace stops for a route direction
router.post('/:id/routes/:routeId/stops', mapProjectId, assignStopsToRoute);
router.put('/:id/routes/:routeId/stops', mapProjectId, assignStopsToRoute);

// Clear stops for a route direction
router.delete('/:id/routes/:routeId/stops', mapProjectId, clearRouteStops);

// Add single stop to route
router.post('/:id/routes/:routeId/stops/add', mapProjectId, addStopToRoute);

// Remove single stop from route
router.delete('/:id/routes/:routeId/stops/:stopId', mapProjectId, removeStopFromRoute);

// Reorder stops for a route direction
router.put('/:id/routes/:routeId/stops/reorder', mapProjectId, reorderRouteStops);

// ============ TRIPS ============
router.get('/:id/trips', mapProjectId, getTrips);
router.get('/:id/trips/:tripId', mapProjectId, getTripById);
router.post('/:id/trips', mapProjectId, createTrip);
router.put('/:id/trips/:tripId', mapProjectId, updateTrip);

// ============ CALENDAR ============
router.get('/:id/calendar', mapProjectId, getCalendar);
router.post('/:id/calendar', mapProjectId, createCalendar);
router.put('/:id/calendar/:serviceId', mapProjectId, updateCalendar);

// ============ FARES ============
router.get('/:id/fares', mapProjectId, getFares);
router.post('/:id/fares', mapProjectId, createFare);
router.put('/:id/fares/:fareId', mapProjectId, updateFare);

// ============ AGENCIES ============
router.get('/:id/agencies', mapProjectId, getAgencies);

export default router;
