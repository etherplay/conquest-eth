// Use process ID to ensure unique pool IDs across parallel test processes
// VITEST_POOL_ID and VITEST_WORKER_ID can be undefined in some configurations
// Using process.pid ensures each Node.js process gets a unique identifier
const poolIdNum = Number(process.env.VITEST_POOL_ID ?? 1);
const workerIdNum = Number(process.env.VITEST_WORKER_ID ?? 1);
const processIdNum = process.pid;

export const poolId = `${(poolIdNum * 1000 + workerIdNum * 100 + (processIdNum % 100)).toString()}`;

export const RPC_PORT = 5051;
export const RPC_URL = `http://localhost:${RPC_PORT}/${poolId}`;
