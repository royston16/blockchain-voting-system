import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // These packages need to be aliased to empty modules
      'pkcs11js': path.resolve(__dirname, 'src/blockchain/mock-modules/empty-module.js'),
      '@grpc/grpc-js': path.resolve(__dirname, 'src/blockchain/mock-modules/empty-module.js'),
      '@hyperledger/fabric-gateway': path.resolve(__dirname, 'src/blockchain/mock-modules/fabric-gateway-mock.js'),
      'util': path.resolve(__dirname, 'src/blockchain/mock-modules/util-mock.js')
    }
  },
  optimizeDeps: {
    exclude: ['pkcs11js', '@grpc/grpc-js', '@hyperledger/fabric-gateway']
  },
  define: {
    // Add Node.js environment variables
    'process.env': {},
    global: {},
  }
})
