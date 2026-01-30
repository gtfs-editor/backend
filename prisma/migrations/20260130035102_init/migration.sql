-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "map_default_lat" DOUBLE PRECISION NOT NULL DEFAULT -6.175389,
    "map_default_lon" DOUBLE PRECISION NOT NULL DEFAULT 106.827139,
    "map_default_zoom" INTEGER NOT NULL DEFAULT 13,
    "table_page_size" INTEGER NOT NULL DEFAULT 10,
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectShare" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "shared_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectInvite" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" TEXT,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "token" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "agency_name" TEXT NOT NULL,
    "agency_url" TEXT NOT NULL,
    "agency_timezone" TEXT NOT NULL,
    "agency_lang" TEXT,
    "agency_phone" TEXT,
    "agency_fare_url" TEXT,
    "agency_email" TEXT,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL,
    "stop_id" TEXT NOT NULL,
    "stop_code" TEXT,
    "stop_name" TEXT NOT NULL,
    "stop_desc" TEXT,
    "stop_lat" DOUBLE PRECISION NOT NULL,
    "stop_lon" DOUBLE PRECISION NOT NULL,
    "zone_id" TEXT,
    "stop_url" TEXT,
    "location_type" INTEGER DEFAULT 0,
    "wheelchair_boarding" INTEGER DEFAULT 0,
    "parent_station" TEXT,
    "platform_code" TEXT,
    "level_id" TEXT,
    "tts_stop_name" TEXT,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "agency_id" TEXT,
    "route_short_name" TEXT,
    "route_long_name" TEXT,
    "route_desc" TEXT,
    "route_type" INTEGER NOT NULL,
    "route_url" TEXT,
    "route_color" TEXT DEFAULT 'FFFFFF',
    "route_text_color" TEXT DEFAULT '000000',
    "route_sort_order" INTEGER,
    "continuous_pickup" INTEGER DEFAULT 1,
    "continuous_drop_off" INTEGER DEFAULT 1,
    "network_id" TEXT,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "trip_headsign" TEXT,
    "trip_short_name" TEXT,
    "direction_id" INTEGER DEFAULT 0,
    "block_id" TEXT,
    "shape_id" TEXT,
    "wheelchair_accessible" INTEGER DEFAULT 0,
    "bikes_allowed" INTEGER DEFAULT 0,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StopTime" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "stop_id" TEXT NOT NULL,
    "arrival_time" TEXT,
    "departure_time" TEXT,
    "stop_sequence" INTEGER NOT NULL,
    "stop_headsign" TEXT,
    "pickup_type" INTEGER DEFAULT 0,
    "drop_off_type" INTEGER DEFAULT 0,
    "continuous_pickup" INTEGER,
    "continuous_drop_off" INTEGER,
    "shape_dist_traveled" DOUBLE PRECISION,
    "timepoint" INTEGER DEFAULT 1,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StopTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calendar" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "monday" INTEGER NOT NULL,
    "tuesday" INTEGER NOT NULL,
    "wednesday" INTEGER NOT NULL,
    "thursday" INTEGER NOT NULL,
    "friday" INTEGER NOT NULL,
    "saturday" INTEGER NOT NULL,
    "sunday" INTEGER NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarDate" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "exception_type" INTEGER NOT NULL,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FareAttribute" (
    "id" TEXT NOT NULL,
    "fare_id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency_type" TEXT NOT NULL,
    "payment_method" INTEGER NOT NULL,
    "transfers" INTEGER,
    "agency_id" TEXT,
    "transfer_duration" INTEGER,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FareAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FareRule" (
    "id" TEXT NOT NULL,
    "fare_id" TEXT NOT NULL,
    "route_id" TEXT,
    "origin_id" TEXT,
    "destination_id" TEXT,
    "contains_id" TEXT,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FareRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shape" (
    "id" TEXT NOT NULL,
    "shape_id" TEXT NOT NULL,
    "shape_pt_sequence" INTEGER NOT NULL,
    "shape_pt_lat" DOUBLE PRECISION NOT NULL,
    "shape_pt_lon" DOUBLE PRECISION NOT NULL,
    "shape_dist_traveled" DOUBLE PRECISION,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "from_stop_id" TEXT NOT NULL,
    "to_stop_id" TEXT NOT NULL,
    "transfer_type" INTEGER NOT NULL DEFAULT 0,
    "min_transfer_time" INTEGER,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Frequency" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "headway_secs" INTEGER NOT NULL,
    "exact_times" INTEGER DEFAULT 0,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Frequency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "level_id" TEXT NOT NULL,
    "level_index" DOUBLE PRECISION NOT NULL,
    "level_name" TEXT,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pathway" (
    "id" TEXT NOT NULL,
    "pathway_id" TEXT NOT NULL,
    "from_stop_id" TEXT NOT NULL,
    "to_stop_id" TEXT NOT NULL,
    "pathway_mode" INTEGER NOT NULL,
    "is_bidirectional" INTEGER NOT NULL,
    "length" DOUBLE PRECISION,
    "traversal_time" INTEGER,
    "stair_count" INTEGER,
    "max_slope" DOUBLE PRECISION,
    "min_width" DOUBLE PRECISION,
    "signposted_as" TEXT,
    "reversed_signposted_as" TEXT,
    "level_id" TEXT,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pathway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedInfo" (
    "id" TEXT NOT NULL,
    "feed_publisher_name" TEXT NOT NULL,
    "feed_publisher_url" TEXT NOT NULL,
    "feed_lang" TEXT NOT NULL,
    "default_lang" TEXT,
    "feed_start_date" TEXT,
    "feed_end_date" TEXT,
    "feed_version" TEXT,
    "feed_contact_email" TEXT,
    "feed_contact_url" TEXT,
    "project_id" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_created_at_idx" ON "User"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_user_id_key" ON "UserPreferences"("user_id");

-- CreateIndex
CREATE INDEX "UserProject_owner_id_idx" ON "UserProject"("owner_id");

-- CreateIndex
CREATE INDEX "UserProject_created_at_idx" ON "UserProject"("created_at");

-- CreateIndex
CREATE INDEX "UserProject_name_idx" ON "UserProject"("name");

-- CreateIndex
CREATE INDEX "ProjectShare_project_id_idx" ON "ProjectShare"("project_id");

-- CreateIndex
CREATE INDEX "ProjectShare_user_id_idx" ON "ProjectShare"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectShare_project_id_user_id_key" ON "ProjectShare"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectInvite_token_key" ON "ProjectInvite"("token");

-- CreateIndex
CREATE INDEX "ProjectInvite_token_idx" ON "ProjectInvite"("token");

-- CreateIndex
CREATE INDEX "ProjectInvite_project_id_idx" ON "ProjectInvite"("project_id");

-- CreateIndex
CREATE INDEX "ProjectInvite_email_idx" ON "ProjectInvite"("email");

-- CreateIndex
CREATE INDEX "ProjectInvite_expires_at_idx" ON "ProjectInvite"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_token_idx" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_user_id_idx" ON "PasswordReset"("user_id");

-- CreateIndex
CREATE INDEX "PasswordReset_expires_at_idx" ON "PasswordReset"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_session_token_key" ON "UserSession"("session_token");

-- CreateIndex
CREATE INDEX "UserSession_session_token_idx" ON "UserSession"("session_token");

-- CreateIndex
CREATE INDEX "UserSession_user_id_idx" ON "UserSession"("user_id");

-- CreateIndex
CREATE INDEX "UserSession_expires_at_idx" ON "UserSession"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_agency_id_key" ON "Agency"("agency_id");

-- CreateIndex
CREATE INDEX "Agency_agency_name_idx" ON "Agency"("agency_name");

-- CreateIndex
CREATE INDEX "Agency_project_id_idx" ON "Agency"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_agency_id_project_id_key" ON "Agency"("agency_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Stop_stop_id_key" ON "Stop"("stop_id");

-- CreateIndex
CREATE INDEX "Stop_stop_name_idx" ON "Stop"("stop_name");

-- CreateIndex
CREATE INDEX "Stop_stop_lat_stop_lon_idx" ON "Stop"("stop_lat", "stop_lon");

-- CreateIndex
CREATE INDEX "Stop_parent_station_idx" ON "Stop"("parent_station");

-- CreateIndex
CREATE INDEX "Stop_zone_id_idx" ON "Stop"("zone_id");

-- CreateIndex
CREATE INDEX "Stop_project_id_idx" ON "Stop"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Stop_stop_id_project_id_key" ON "Stop"("stop_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Route_route_id_key" ON "Route"("route_id");

-- CreateIndex
CREATE INDEX "Route_route_type_idx" ON "Route"("route_type");

-- CreateIndex
CREATE INDEX "Route_agency_id_idx" ON "Route"("agency_id");

-- CreateIndex
CREATE INDEX "Route_project_id_idx" ON "Route"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Route_route_id_project_id_key" ON "Route"("route_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_trip_id_key" ON "Trip"("trip_id");

-- CreateIndex
CREATE INDEX "Trip_route_id_idx" ON "Trip"("route_id");

-- CreateIndex
CREATE INDEX "Trip_service_id_idx" ON "Trip"("service_id");

-- CreateIndex
CREATE INDEX "Trip_shape_id_idx" ON "Trip"("shape_id");

-- CreateIndex
CREATE INDEX "Trip_project_id_idx" ON "Trip"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_trip_id_project_id_key" ON "Trip"("trip_id", "project_id");

-- CreateIndex
CREATE INDEX "StopTime_trip_id_idx" ON "StopTime"("trip_id");

-- CreateIndex
CREATE INDEX "StopTime_stop_id_idx" ON "StopTime"("stop_id");

-- CreateIndex
CREATE INDEX "StopTime_arrival_time_idx" ON "StopTime"("arrival_time");

-- CreateIndex
CREATE INDEX "StopTime_departure_time_idx" ON "StopTime"("departure_time");

-- CreateIndex
CREATE INDEX "StopTime_project_id_idx" ON "StopTime"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "StopTime_trip_id_stop_sequence_project_id_key" ON "StopTime"("trip_id", "stop_sequence", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Calendar_service_id_key" ON "Calendar"("service_id");

-- CreateIndex
CREATE INDEX "Calendar_start_date_idx" ON "Calendar"("start_date");

-- CreateIndex
CREATE INDEX "Calendar_end_date_idx" ON "Calendar"("end_date");

-- CreateIndex
CREATE INDEX "Calendar_project_id_idx" ON "Calendar"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Calendar_service_id_project_id_key" ON "Calendar"("service_id", "project_id");

-- CreateIndex
CREATE INDEX "CalendarDate_date_idx" ON "CalendarDate"("date");

-- CreateIndex
CREATE INDEX "CalendarDate_project_id_idx" ON "CalendarDate"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarDate_service_id_date_project_id_key" ON "CalendarDate"("service_id", "date", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "FareAttribute_fare_id_key" ON "FareAttribute"("fare_id");

-- CreateIndex
CREATE INDEX "FareAttribute_project_id_idx" ON "FareAttribute"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "FareAttribute_fare_id_project_id_key" ON "FareAttribute"("fare_id", "project_id");

-- CreateIndex
CREATE INDEX "FareRule_project_id_idx" ON "FareRule"("project_id");

-- CreateIndex
CREATE INDEX "Shape_shape_id_idx" ON "Shape"("shape_id");

-- CreateIndex
CREATE INDEX "Shape_project_id_idx" ON "Shape"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Shape_shape_id_shape_pt_sequence_project_id_key" ON "Shape"("shape_id", "shape_pt_sequence", "project_id");

-- CreateIndex
CREATE INDEX "Transfer_from_stop_id_idx" ON "Transfer"("from_stop_id");

-- CreateIndex
CREATE INDEX "Transfer_to_stop_id_idx" ON "Transfer"("to_stop_id");

-- CreateIndex
CREATE INDEX "Transfer_project_id_idx" ON "Transfer"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_from_stop_id_to_stop_id_project_id_key" ON "Transfer"("from_stop_id", "to_stop_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Frequency_trip_id_key" ON "Frequency"("trip_id");

-- CreateIndex
CREATE INDEX "Frequency_trip_id_idx" ON "Frequency"("trip_id");

-- CreateIndex
CREATE INDEX "Frequency_start_time_idx" ON "Frequency"("start_time");

-- CreateIndex
CREATE INDEX "Frequency_project_id_idx" ON "Frequency"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Level_level_id_key" ON "Level"("level_id");

-- CreateIndex
CREATE INDEX "Level_project_id_idx" ON "Level"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Level_level_id_project_id_key" ON "Level"("level_id", "project_id");

-- CreateIndex
CREATE INDEX "Pathway_from_stop_id_idx" ON "Pathway"("from_stop_id");

-- CreateIndex
CREATE INDEX "Pathway_to_stop_id_idx" ON "Pathway"("to_stop_id");

-- CreateIndex
CREATE INDEX "Pathway_level_id_idx" ON "Pathway"("level_id");

-- CreateIndex
CREATE INDEX "Pathway_project_id_idx" ON "Pathway"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "Pathway_pathway_id_project_id_key" ON "Pathway"("pathway_id", "project_id");

-- CreateIndex
CREATE INDEX "FeedInfo_project_id_idx" ON "FeedInfo"("project_id");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProject" ADD CONSTRAINT "UserProject_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectShare" ADD CONSTRAINT "ProjectShare_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectShare" ADD CONSTRAINT "ProjectShare_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectInvite" ADD CONSTRAINT "ProjectInvite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_parent_station_fkey" FOREIGN KEY ("parent_station") REFERENCES "Stop"("stop_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "Level"("level_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "Route"("route_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Calendar"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopTime" ADD CONSTRAINT "StopTime_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopTime" ADD CONSTRAINT "StopTime_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("trip_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StopTime" ADD CONSTRAINT "StopTime_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "Stop"("stop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calendar" ADD CONSTRAINT "Calendar_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarDate" ADD CONSTRAINT "CalendarDate_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarDate" ADD CONSTRAINT "CalendarDate_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Calendar"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareAttribute" ADD CONSTRAINT "FareAttribute_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareAttribute" ADD CONSTRAINT "FareAttribute_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareRule" ADD CONSTRAINT "FareRule_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareRule" ADD CONSTRAINT "FareRule_fare_id_fkey" FOREIGN KEY ("fare_id") REFERENCES "FareAttribute"("fare_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FareRule" ADD CONSTRAINT "FareRule_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "Route"("route_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shape" ADD CONSTRAINT "Shape_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_from_stop_id_fkey" FOREIGN KEY ("from_stop_id") REFERENCES "Stop"("stop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_to_stop_id_fkey" FOREIGN KEY ("to_stop_id") REFERENCES "Stop"("stop_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frequency" ADD CONSTRAINT "Frequency_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pathway" ADD CONSTRAINT "Pathway_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pathway" ADD CONSTRAINT "Pathway_from_stop_id_fkey" FOREIGN KEY ("from_stop_id") REFERENCES "Stop"("stop_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pathway" ADD CONSTRAINT "Pathway_to_stop_id_fkey" FOREIGN KEY ("to_stop_id") REFERENCES "Stop"("stop_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pathway" ADD CONSTRAINT "Pathway_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "Level"("level_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedInfo" ADD CONSTRAINT "FeedInfo_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
