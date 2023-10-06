import {writable} from 'svelte/store';

export type MetadataTable = {[id: string]: Record<string, string | number | boolean>};

export const planetMetadata = writable<MetadataTable>({});
