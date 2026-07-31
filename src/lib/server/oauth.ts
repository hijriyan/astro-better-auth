import { loadEnv } from 'vite';
import { socialProviderMaps, type SocialProviderType } from '@/lib/constants';

export const getActiveOAuthProviders = () => {
  const activeProviders: Record<string, Omit<SocialProviderType, 'icon'>> = {};

  if (typeof process === 'undefined') {
    return activeProviders;
  }

  const mode = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE) 
    ? import.meta.env.MODE 
    : process.env.NODE_ENV || 'development';

  const env = loadEnv(mode, process.cwd(), '');

  const envKeys = Object.keys(env);
  for (const key of envKeys) {
    if (key.endsWith('_CLIENT_ID')) {
      const providerId = key.replace('_CLIENT_ID', '').toLowerCase();
      const clientId = env[key];
      const clientSecret = env[`${providerId.toUpperCase()}_CLIENT_SECRET`];

      if (clientId && clientSecret) {
        const knownProvider = socialProviderMaps[providerId];
        activeProviders[providerId] = {
          label: knownProvider ? knownProvider.label : providerId.charAt(0).toUpperCase() + providerId.slice(1),
          color: knownProvider ? knownProvider.color : false,
        };
      }
    }
  }

  return activeProviders;
};
