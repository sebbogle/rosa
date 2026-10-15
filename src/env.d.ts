declare interface ImportMeta {
  readonly env: {
    readonly NG_APP_GOOGLE_CLIENT_ID?: string;
  };
}

declare module '*/tokens.css' {
  const css: string;
  export default css;
}
