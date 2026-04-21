const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
	resolver: {
		// Prevent Metro from crawling backend/build artifacts in this monorepo.
		blockList: [
			/.*[\\/]backend[\\/].*/,
			/.*[\\/]android[\\/]build[\\/].*/,
			/.*[\\/]android[\\/]app[\\/]build[\\/].*/,
			/.*[\\/]ios[\\/]build[\\/].*/,
		],
	},
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
