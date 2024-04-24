import { Media } from '@stump/types'
import React, { useMemo } from 'react'

import { EntityTable, EntityTableProps } from '@/components/table'

import { defaultColumns } from './columns'

type Props = Omit<EntityTableProps<Media>, 'columns'>

export default function BookTable(props: Props) {
	// TODO: dynamic columns
	const columns = useMemo(() => defaultColumns, [])

	return <EntityTable columns={columns} {...props} />
}
