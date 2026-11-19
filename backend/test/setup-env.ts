import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.THROTTLE_TTL = '60';
process.env.THROTTLE_LIMIT = '10';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'test_user';
process.env.DB_PASS = 'test_password';
process.env.DB_NAME = 'test_db';
process.env.DB_SSL = 'false';
