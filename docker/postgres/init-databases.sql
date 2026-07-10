-- Database-per-service: separate databases inside a single dev Postgres container.
-- In production each service would get its own instance/cluster.
CREATE DATABASE identity_db;
CREATE DATABASE catalog_db;
CREATE DATABASE ordering_db;
CREATE DATABASE inventory_db;
CREATE DATABASE payment_db;
