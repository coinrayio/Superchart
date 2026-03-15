import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import '@superchart/index.less'

// Note: StrictMode is disabled because it causes double-mounting in dev mode,
// which triggers chart.dispose() during the first unmount, causing the UI to disappear.
// This is a known issue with imperative APIs that manage their own DOM/React roots.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
