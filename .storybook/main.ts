import type {StorybookConfig} from "@storybook/react-vite"
import path from "path"
import {fileURLToPath} from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: [
    "./overlay-stories/**/*.stories.@(ts|tsx)",
    "./api-stories/**/*.stories.@(ts|tsx)",
    "./feature-stories/**/*.stories.@(ts|tsx)",
  ],
  framework: "@storybook/react-vite",
  viteFinal: (config) => {
    config.resolve ??= {}
    config.resolve.alias = {
      ...config.resolve.alias,
      "@superchart": path.resolve(__dirname, "../src/lib"),
    }
    config.envDir = path.resolve(__dirname)
    return config
  },
}
export default config
