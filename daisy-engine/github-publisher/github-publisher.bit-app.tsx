import { NodeServer } from '@bitdev/node.node-server';

export default NodeServer.from({
  name: 'github-publisher',
  mainPath: import.meta.resolve('./github-publisher.app-root.js'),
});
