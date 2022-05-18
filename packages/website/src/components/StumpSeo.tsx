import React from 'react';
import { DefaultSeo } from 'next-seo';

import SEO from '../../next-seo.config';

export default function StumpSeo() {
	return <DefaultSeo {...SEO} />;
}
