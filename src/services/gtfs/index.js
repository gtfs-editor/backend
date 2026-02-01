// GTFS Services Index
// Compatible with existing file structure

// Upload and Reset
export { uploadGTFS } from './upload.js';
export { resetGTFS } from './reset.js';

// Agencies
export { getAgencies } from './get-agencies.js';

// Stops - use existing files
export { getStops } from './get-stops.js';
export { createStop, updateStop } from './manage-stops.js';

// Routes - use existing files
export { getRoutes, getRouteById } from './get-routes.js';
export { getRouteDetails } from './get-route-details.js';
export { createRoute, updateRoute } from './manage-routes.js';
export { assignStopsToRoute, getRouteStops, getRouteStopsByDirection } from './manage-route-stops.js';

// Trips - use existing files
export { getTrips, getTripById } from './get-trips.js';
export { createTrip, updateTrip, deleteTrip } from './manage-trips.js';

// Calendar - use existing files
export { getCalendar } from './get-calendar.js';
export { createCalendar, updateCalendar, deleteCalendar } from './manage-calendar.js';

// Fares - use existing files
export { getFares } from './get-fares.js';
export { createFare, updateFare, deleteFare, createFareRule, deleteFareRule } from './manage-fares.js';