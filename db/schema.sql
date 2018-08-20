CREATE TABLE sensors (id varchar(32), timestamp integer, value float, primary key (id, timestamp));
CREATE TABLE IF NOT EXISTS "power" (timestamp int, value float, phase int, primary key (timestamp, phase));
CREATE INDEX idxsensors on sensors(id, timestamp, value);
CREATE INDEX idphase on power (phase);
CREATE TABLE dht (id varchar(6), timestamp integer, temp float, hum float, primary key (id, timestamp));
