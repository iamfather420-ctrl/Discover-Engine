import { Platform } from '@bitdev/platforms.platform';

const DaisyApp = import.meta.resolve('@agatenft/daisy-engine.daisy-app');
const InventionService = import.meta.resolve('@agatenft/daisy-engine.invention-service');
const PlatformGateway = import.meta.resolve('@bitdev/platforms.backend.gateway-server');

/**
 * Daisy Invention Engine platform — composes the React workbench with the
 * invention service behind the API gateway as a single deployable unit.
 */
export const DaisyPlatform = Platform.from({
  name: 'daisy-platform',

  frontends: {
    main: DaisyApp,
    mainPortRange: [3000, 3100],
  },

  backends: {
    main: PlatformGateway,
    services: [InventionService],
  },
});

export default DaisyPlatform;
