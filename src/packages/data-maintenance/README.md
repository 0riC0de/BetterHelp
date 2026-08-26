# Data Maintenance Package

This package provides a deliberately limited database administration API. It is
not a SQL console and never accepts model/table names. Every operation is an
allowlisted `ClearTarget`, requires an authenticated administrator, an allowed
dashboard origin, rate limiting, and an exact typed confirmation.

Technician rows, password hashes, roles, token versions, active refresh tokens,
Prisma migration history, and WhatsApp filesystem credentials cannot be targeted.
Operations run in serializable transactions under a PostgreSQL advisory lock.
