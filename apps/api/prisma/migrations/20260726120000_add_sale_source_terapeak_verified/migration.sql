-- A Sale first seen by the real-time eBay completed search and later re-supplied
-- by Terapeak: the price on the row is the realized one (same as 'terapeak'),
-- but the row's provenance — caught in the Terapeak lag window and since
-- corroborated — is worth keeping. Forward-only: rows upgraded before this
-- migration were stamped plain 'terapeak' and cannot be recovered.
ALTER TYPE "SaleSource" ADD VALUE 'terapeak_verified';
