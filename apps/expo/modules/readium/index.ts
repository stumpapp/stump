// Reexport the native module. On web, it will be resolved to ReadiumModule.web.ts
// and on native platforms to ReadiumModule.ts
export * from './src/Readium.types'
export { default } from './src/ReadiumModule'
export { default as ReadiumView } from './src/ReadiumView'
