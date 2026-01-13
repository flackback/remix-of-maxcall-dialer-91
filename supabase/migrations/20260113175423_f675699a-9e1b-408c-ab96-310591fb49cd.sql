-- Add is_active column to trunk_config table
ALTER TABLE public.trunk_config 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add index for faster queries on active trunks
CREATE INDEX IF NOT EXISTS idx_trunk_config_is_active ON public.trunk_config(is_active) WHERE is_active = TRUE;