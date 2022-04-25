import React from 'react';
import { useParams } from 'react-router-dom';

export default function Book() {
	const { id } = useParams();

	if (!id) {
		throw new Error('Book id is required for this route.');
	}

	return <div>{id}</div>;
}
