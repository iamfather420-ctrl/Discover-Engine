import { NodeServer } from '@bitdev/node.node-server';

export default NodeServer.from({
  name: 'invention-service',
  mainPath: import.meta.resolve('./invention-service.app-root.js'),
});
