const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Add alias for @arca scope to point to the packages folder in the workspace
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  '@arca': path.resolve(workspaceRoot, 'packages'),
};

module.exports = config;