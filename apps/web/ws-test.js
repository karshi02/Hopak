const { io } = require('socket.io-client');

const [, , ownerToken, tenantToken] = process.argv;

const ownerSocket = io('http://localhost:4000', { auth: { token: ownerToken } });
const tenantSocket = io('http://localhost:4000', { auth: { token: tenantToken } });

ownerSocket.on('connect', () => console.log('OWNER_CONNECTED'));
tenantSocket.on('connect', () => console.log('TENANT_CONNECTED'));
ownerSocket.on('connect_error', (e) => console.log('OWNER_CONNECT_ERROR', e.message));
tenantSocket.on('connect_error', (e) => console.log('TENANT_CONNECT_ERROR', e.message));

ownerSocket.on('booking:new', (b) => console.log('OWNER_RECEIVED booking:new', JSON.stringify(b)));
ownerSocket.on('booking:updated', (b) => console.log('OWNER_RECEIVED booking:updated', JSON.stringify(b)));
tenantSocket.on('booking:new', (b) => console.log('TENANT_RECEIVED booking:new', JSON.stringify(b)));
tenantSocket.on('booking:updated', (b) => console.log('TENANT_RECEIVED booking:updated', JSON.stringify(b)));

setTimeout(() => {
  console.log('DONE');
  process.exit(0);
}, 30000);
