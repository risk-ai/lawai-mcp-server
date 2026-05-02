import { Pool } from 'pg';
export declare function getPool(): Pool;
export declare function closePool(): Promise<void>;
