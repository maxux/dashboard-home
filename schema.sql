CREATE TABLE sensors (id varchar(32), timestamp integer, value float, primary key (id, timestamp));
CREATE INDEX idxsensors on sensors(id, timestamp, value);
CREATE TABLE IF NOT EXISTS "power" (timestamp int, value float, phase int, primary key (timestamp, phase));
CREATE INDEX idphase on power (phase);

