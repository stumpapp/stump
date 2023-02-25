import { Helmet } from 'react-helmet'
import { useNavigate } from 'react-router'

import { useAppContext } from '../../context'

export default function CreateLibrary() {
	const navigate = useNavigate()
	const { isServerOwner } = useAppContext()

	if (!isServerOwner) {
		navigate('..')
		return null
	}

	return (
		<>
			<Helmet>
				<title>Create Library</title>
			</Helmet>
			TODO: Create Library
		</>
	)
}
