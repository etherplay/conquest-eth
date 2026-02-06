import {Instance, Server} from 'prool';
import {RPC_PORT} from './url';

export const anvilServer = Server.create({
	instance: Instance.anvil(),
	port: RPC_PORT,
});
