/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_STUMP_SERVER_BASE_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
