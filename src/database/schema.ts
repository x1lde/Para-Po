export const SCHEMA_VERSION = 2;

// Static SQL only. Bind values from data or users in runAsync/getAllAsync.
export const INITIAL_SCHEMA = `
CREATE TABLE landmarks (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  classification_label TEXT NOT NULL UNIQUE
);
CREATE TABLE destinations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180)
);
CREATE TABLE boarding_points (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180 AND 180)
);
CREATE TABLE transportation_routes (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  transportation_type TEXT NOT NULL CHECK (transportation_type IN ('jeepney', 'bus', 'e-bus')),
  destination_id TEXT NOT NULL REFERENCES destinations(id)
);
CREATE TABLE route_boarding_points (
  route_id TEXT NOT NULL REFERENCES transportation_routes(id),
  boarding_point_id TEXT NOT NULL REFERENCES boarding_points(id),
  stop_order INTEGER NOT NULL CHECK (stop_order >= 0 AND stop_order = CAST(stop_order AS INTEGER)),
  PRIMARY KEY (route_id, boarding_point_id),
  UNIQUE (route_id, stop_order)
);
CREATE TABLE landmark_boarding_points (
  landmark_id TEXT NOT NULL REFERENCES landmarks(id),
  boarding_point_id TEXT NOT NULL REFERENCES boarding_points(id),
  PRIMARY KEY (landmark_id, boarding_point_id)
);
CREATE INDEX routes_destination ON transportation_routes(destination_id);
CREATE INDEX route_points_boarding ON route_boarding_points(boarding_point_id);
CREATE TABLE dataset_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  source_notes TEXT NOT NULL
);
`;

// Apply after the version 1 schema, including on a fresh installation.
// Nullable additions preserve existing rows without inventing instructions.
export const COMMUTER_INSTRUCTIONS_MIGRATION = `
ALTER TABLE transportation_routes ADD COLUMN alighting_location TEXT;
ALTER TABLE transportation_routes ADD COLUMN alighting_instructions TEXT;
ALTER TABLE transportation_routes ADD COLUMN destination_walking_instructions TEXT;
ALTER TABLE route_boarding_points ADD COLUMN boarding_instructions TEXT;
ALTER TABLE landmark_boarding_points ADD COLUMN walking_instructions TEXT;
`;
