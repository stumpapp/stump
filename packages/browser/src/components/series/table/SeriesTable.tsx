import { Series } from '@stump/types'
import React, { useMemo } from 'react'

import { EntityTable, EntityTableProps } from '@/components/table'

import { defaultColumns } from './columns'

type Props = Omit<EntityTableProps<Series>, 'columns'>

export default function SeriesTable(props: Props) {
	// TODO: dynamic columns
	const columns = useMemo(() => defaultColumns, [])

	return <EntityTable columns={columns} {...props} />
}
