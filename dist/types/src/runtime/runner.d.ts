import { Environment } from './environment';
export declare class Runner {
    private env;
    constructor(env: Environment);
    run(type: string, name: string, path?: string, level?: number): Promise<void>;
}
