-- Migration: Add Warranty System Fields
-- Created: 2025-11-17
-- Description: Adds fields to support warranty detection and tracking system for external repair orders
--
-- Phase 2: Warranty Detection on Order Submission
-- Phase 3: Warranty Validation on Reception Completion
--
-- Business Rules:
-- - Warranty period: 1 year from reception date (tbl_recepciones.fecha_recepcion)
-- - Only applies to external providers (tbl_proveedores.es_externo = TRUE)
-- - Requires NC (Non-Conformity) number when warranty is accepted
-- - Tracks provider warranty acceptance/rejection on reception

-- ============================================================================
-- PHASE 2 FIELDS: Order Submission Warranty Tracking (tbl_pedidos_rep)
-- ============================================================================

-- Field to track when user explicitly declines warranty popup for duplicate material
ALTER TABLE tbl_pedidos_rep
ADD COLUMN IF NOT EXISTS enviado_sin_garantia BOOLEAN DEFAULT false;

COMMENT ON COLUMN tbl_pedidos_rep.enviado_sin_garantia IS
  'TRUE when user explicitly declined warranty popup for duplicate material detected within 1-year period';

-- Note: informacion_nc field already exists in tbl_pedidos_rep
-- It will be used to store NC number (INCM.20XX.XXX) when warranty is accepted

-- ============================================================================
-- PHASE 3 FIELDS: Reception Warranty Validation (tbl_recepciones)
-- ============================================================================

-- Field to track if provider accepted the warranty claim
ALTER TABLE tbl_recepciones
ADD COLUMN IF NOT EXISTS garantia_aceptada_proveedor BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN tbl_recepciones.garantia_aceptada_proveedor IS
  'Provider warranty acceptance status: TRUE = accepted, FALSE = rejected, NULL = not applicable (non-warranty orders)';

-- Field to store rejection reason when provider rejects warranty
ALTER TABLE tbl_recepciones
ADD COLUMN IF NOT EXISTS motivo_rechazo_garantia TEXT DEFAULT NULL;

COMMENT ON COLUMN tbl_recepciones.motivo_rechazo_garantia IS
  'Reason provided when provider rejects warranty claim (required when garantia_aceptada_proveedor = FALSE)';

-- ============================================================================
-- VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure that if warranty is rejected, a reason must be provided
ALTER TABLE tbl_recepciones
ADD CONSTRAINT chk_motivo_rechazo_garantia_required
CHECK (
  garantia_aceptada_proveedor IS NULL OR
  garantia_aceptada_proveedor = TRUE OR
  (garantia_aceptada_proveedor = FALSE AND motivo_rechazo_garantia IS NOT NULL AND LENGTH(TRIM(motivo_rechazo_garantia)) > 0)
);

COMMENT ON CONSTRAINT chk_motivo_rechazo_garantia_required ON tbl_recepciones IS
  'Ensures that when provider rejects warranty (garantia_aceptada_proveedor = FALSE), a rejection reason must be provided';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE tbl_pedidos_rep IS
  'Repair orders table - includes warranty tracking fields (enviado_sin_garantia, informacion_nc)';

COMMENT ON TABLE tbl_recepciones IS
  'Receptions table - includes provider warranty acceptance tracking (garantia_aceptada_proveedor, motivo_rechazo_garantia)';
