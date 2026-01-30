export const exampleGTFS = {
    agency: {
        agency_id: "EX_AGENCY",
        agency_name: "Example Transit Agency",
        agency_url: "https://example.com",
        agency_timezone: "Asia/Jakarta",
        agency_lang: "id",
        agency_phone: "+622112345678"
    },
    stops: [
        {
            stop_id: "EX_STOP_1",
            stop_name: "Central Station",
            stop_desc: "Main city transport hub",
            stop_lat: -6.175392,
            stop_lon: 106.827153,
            location_type: 1
        },
        {
            stop_id: "EX_STOP_2",
            stop_name: "Market Square",
            stop_desc: "Downtown market area",
            stop_lat: -6.185392,
            stop_lon: 106.837153,
            location_type: 0,
            parent_station: "EX_STOP_1" // Just to show hierarchy
        },
        {
            stop_id: "EX_STOP_3",
            stop_name: "City Park",
            stop_desc: "Green space and recreation",
            stop_lat: -6.195392,
            stop_lon: 106.847153,
            location_type: 0
        }
    ],
    routes: [
        {
            route_id: "EX_ROUTE_1",
            route_short_name: "101",
            route_long_name: "City Loop",
            route_desc: "Downtown circular route",
            route_type: 3, // Bus
            route_color: "FF0000",
            route_text_color: "FFFFFF"
        }
    ],
    trips: [
        {
            trip_id: "EX_TRIP_1",
            route_id: "EX_ROUTE_1",
            service_id: "EX_SERVICE_FULL",
            trip_headsign: "City Park via Market",
            direction_id: 0,
            block_id: "BLK_1",
            shape_id: "SHP_1"
        }
    ],
    stop_times: [
        {
            trip_id: "EX_TRIP_1",
            stop_id: "EX_STOP_2", // Using Stop 2 (Market) as start for example
            stop_sequence: 1,
            arrival_time: "08:00:00",
            departure_time: "08:00:00",
            timepoint: 1
        },
        {
            trip_id: "EX_TRIP_1",
            stop_id: "EX_STOP_3",
            stop_sequence: 2,
            arrival_time: "08:15:00",
            departure_time: "08:15:00",
            timepoint: 1
        }
    ],
    calendar: [
        {
            service_id: "EX_SERVICE_FULL",
            monday: 1,
            tuesday: 1,
            wednesday: 1,
            thursday: 1,
            friday: 1,
            saturday: 1,
            sunday: 1,
            start_date: "20240101",
            end_date: "20241231"
        }
    ]
};
