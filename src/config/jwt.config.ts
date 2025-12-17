import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key',
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '1d',
}));
