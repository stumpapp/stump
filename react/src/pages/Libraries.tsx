import React from 'react';
import { useParams } from 'react-router-dom';

export default function Library() {
	const { id } = useParams();
	return <div>library {id}</div>;
}
