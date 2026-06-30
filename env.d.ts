declare global {
  interface ImportMeta {
    env: {
      NODE_ENV: "production" | "development";
      PROD: boolean;
      DEV: boolean;
    };
  }
}

export {};
