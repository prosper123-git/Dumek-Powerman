import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import babel from "@babel/core";
import reactJsx from "@babel/plugin-transform-react-jsx";
import { defineConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  esbuild: false,
  optimizeDeps: {
    noDiscovery: true,
    include: []
  },
  plugins: [{
    name: "babel-react-jsx",
    enforce: "pre",
    async transform(code, id) {
      if (!id.endsWith(".jsx")) return null;
      const result = await babel.transformAsync(code, {
        filename: id,
        configFile: false,
        babelrc: false,
        sourceType: "module",
        plugins: [[reactJsx, { runtime: "automatic" }]]
      });
      return { code: result.code, map: result.map };
    },
    resolveId(source) {
      const modules = {
        react: "https://esm.sh/react@19.3.1",
        "react-dom/client": "https://esm.sh/react-dom@19.3.1/client?external=react",
        "react/jsx-runtime": "https://esm.sh/react@19.3.1/jsx-runtime"
      };
      return modules[source] ? { id: modules[source], external: true } : null;
    }
  }],
  build: {
    minify: false,
    rollupOptions: {
      external: [/^https:\/\/esm\.sh\//],
      input: {
        home: resolve(root, "index.html"),
        about: resolve(root, "about.html"),
        cart: resolve(root, "cart.html"),
        contact: resolve(root, "contact.html"),
        login: resolve(root, "login.html"),
        product: resolve(root, "product.html"),
        shop: resolve(root, "shop.html")
      }
    }
  }
});