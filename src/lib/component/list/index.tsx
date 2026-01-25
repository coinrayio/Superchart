/**
 * List Component
 */

import type { CSSProperties, ReactNode } from 'react'
import { Loading } from '../loading'
import { Empty } from '../empty'

export interface ListDataSourceItem {
  key: string
  text: string
}

export interface ListProps<T = unknown> {
  className?: string
  style?: CSSProperties
  loading?: boolean
  dataSource?: T[]
  renderItem?: (data: T, index: number) => ReactNode
  children?: ReactNode
}

export function List<T = unknown>({
  className,
  style,
  loading,
  dataSource,
  renderItem,
  children,
}: ListProps<T>) {
  const hasData = dataSource && dataSource.length > 0
  const hasChildren = Boolean(children)

  return (
    <ul style={style} className={`superchart-list ${className ?? ''}`}>
      {loading && <Loading />}
      {!loading && !hasChildren && !hasData && <Empty />}
      {!loading && hasChildren && children}
      {!loading && !hasChildren && hasData && dataSource.map((data, index) => (
        renderItem?.(data, index) ?? <li key={index} />
      ))}
    </ul>
  )
}

export default List
