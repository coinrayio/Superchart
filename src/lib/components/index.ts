/**
 * Superchart Components
 */

// Main class-based API (framework-agnostic)
export { default as Superchart, Superchart as SuperchartClass } from './Superchart'
export type { SuperchartOptions, SuperchartApi } from './Superchart'

// Internal components (for advanced usage with React)
export { ChartWidget } from './ChartWidget'
export type { ChartWidgetProps, ChartWidgetRef } from './ChartWidget'

// Internal component for React rendering
export { SuperchartComponent } from './SuperchartComponent'
export type { SuperchartComponentProps } from './SuperchartComponent'
