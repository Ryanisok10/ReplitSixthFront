// Ambient declaration so `import x from './file.txt?raw'` is typed as string.
// (Vite's own `vite/client` types also cover `*?raw`; this makes it explicit.)
declare module '*.txt?raw' {
  const content: string;
  export default content;
}
