import { RedService } from './service';

const globalForRed = globalThis as unknown as { __redService?: RedService };

export const getRedService = (): RedService => {
  globalForRed.__redService ??= new RedService();
  return globalForRed.__redService;
};
