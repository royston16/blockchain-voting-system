import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

//https://vitejs.dev/config/ - documentation for the vite config
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      //these packages need to be aliased to empty modules
      'pkcs11js': path.resolve(__dirname, 'src/blockchain/mock-modules/empty-module.js'),
      '@grpc/grpc-js': path.resolve(__dirname, 'src/blockchain/mock-modules/empty-module.js'),
      'util': path.resolve(__dirname, 'src/blockchain/mock-modules/util-mock.js')
    }
  },
  define: {
    //add the node.js environment variables
    'process.env': {},
    global: {},
  }
})
