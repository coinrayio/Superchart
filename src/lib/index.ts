// Superchart - Advanced Charting Library UI (Framework-agnostic)

// Main export - the class-based Superchart API
export { default as Superchart, Superchart as SuperchartClass } from './components/Superchart'
export type { SuperchartOptions, SuperchartApi } from './components/Superchart'

// Export types
export * from './types'

// Export store for advanced usage
export * as store from './store'
export type { PaneProperties } from './store/chartStore'

// Export hooks for React users who need them
export { useChartState } from './hooks/useChartState'
export type { UseChartStateOptions } from './hooks/useChartState'

// Re-export internal components for advanced usage
export { ChartWidget } from './components/ChartWidget'
export type { ChartWidgetProps, ChartWidgetRef } from './components/ChartWidget'
export { SuperchartComponent } from './components/SuperchartComponent'
export type { SuperchartComponentProps } from './components/SuperchartComponent'

// Export widgets (UI components)
export {
  PeriodBar,
  DrawingBar,
  IndicatorModal,
  TimezoneModal,
  SettingModal,
  ScreenshotModal,
  SymbolSearchModal,
  SettingFloating,
} from './widget'
export type {
  PeriodBarProps,
  Period,
  SymbolInfo,
  DrawingBarProps,
  IndicatorModalProps,
  TimezoneModalProps,
  SettingModalProps,
  ScreenshotModalProps,
  SymbolSearchModalProps,
  SymbolSearchDatafeed,
  FloatingProps,
  FloatingAction,
} from './widget'

// Export base components
export {
  Button,
  Checkbox,
  Color,
  Empty,
  Input,
  List,
  Loading,
  Modal,
  Popup,
  GenericPopup,
  Select,
  Switch,
} from './component'
export type {
  ButtonProps,
  ButtonType,
  CheckboxProps,
  ColorProps,
  EmptyProps,
  InputProps,
  ListProps,
  ListDataSourceItem,
  LoadingProps,
  ModalProps,
  ModalButton,
  PopupProps,
  SelectProps,
  SelectDataSourceItem,
  SwitchProps,
} from './component'

// Export i18n
export { default as i18n, load as loadLocale } from './i18n'

// Export helpers
export { getScreenSize, getPrecision, convertFontWeightNameToNumber } from './helpers'
export type { FontWeights } from './helpers'

// Import styles
import './index.less'
