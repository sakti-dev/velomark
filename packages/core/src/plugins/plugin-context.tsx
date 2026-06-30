import { createContext, useContext, type JSX } from "solid-js";

import type { PluginConfig } from "./types";

const PluginContext = createContext<PluginConfig>({});

export function PluginProvider(props: { children: JSX.Element; config: PluginConfig }) {
  return <PluginContext.Provider value={props.config}>{props.children}</PluginContext.Provider>;
}

export function usePlugins(): PluginConfig {
  return useContext(PluginContext);
}
