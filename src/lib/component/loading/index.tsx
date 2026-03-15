/**
 * Loading Component
 */

import type { CSSProperties } from 'react'

export interface LoadingProps {
  className?: string
  style?: CSSProperties
}

export function Loading(props: LoadingProps = {}) {
  return (
    <div className={`superchart-loading ${props.className ?? ''}`} style={props.style}>
      <i className="circle1" />
      <i className="circle2" />
      <i className="circle3" />
    </div>
  )
}

export default Loading
