-- Enable RLS on Prisma's internal migration tracking table.
-- No permissive policies are added, so anon/authenticated roles cannot read
-- migration history. The postgres superuser (used by Prisma's direct connection)
-- bypasses RLS and can still read and write this table normally.
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
