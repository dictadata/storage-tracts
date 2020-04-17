SHOW TABLES;
DESCRIBE foo_schema_etl2;

SELECT * FROM foo_schema;
SELECT * FROM foo_transfer;
SELECT * FROM foo_dbtransform;
SELECT * FROM rest_forecast;

DELETE FROM foo_schema;
DELETE FROM foo_transfer;
DELETE FROM foo_dbtransform;
DELETE FROM rest_forecast;

DROP TABLE foo_schema;
DROP TABLE foo_transfer;
DROP TABLE foo_dbtransform;
DROP TABLE rest_forecast;
DROP TABLE foo_schema_etl2;