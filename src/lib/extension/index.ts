/**
 * Superchart overlay extensions
 *
 * Registers overlays that live on the Superchart side (not in klinecharts).
 * These overlays need access to Superchart resources like icomoon fonts.
 *
 * Import this module for its side-effect (overlay registration).
 */

import { registerOverlay } from 'klinecharts'

import orderLine from './orderLine'

// Register order line overlay (factory → template → registerOverlay)
const orderLineTemplate = orderLine()
registerOverlay(orderLineTemplate)

// Re-export order line API and types
export { createOrderLine } from './orderLineApi'
export type { OrderLine, OrderLineProperties, OrderLineStyle, OrderLineEventListener } from './orderLineApi'
