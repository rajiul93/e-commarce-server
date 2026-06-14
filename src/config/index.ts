export default {
  database_url: process.env.DATABASE_URL as string,
  port: process.env.PORT || 3000,
  jwt_access_secret: (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET) as string,
  jwt_refresh_secret: (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  node_env: process.env.NODE_ENV || 'development',
};
