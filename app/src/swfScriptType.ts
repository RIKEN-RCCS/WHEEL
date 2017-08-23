import path = require('path');

/**
 * running state
 */
type SwfScriptType = 'Bash' | 'Lua' | 'Batch';

/**
 * runnning state extension
 */
namespace SwfScriptType {
    /**
     * state planning
     */
    export const BASH: SwfScriptType = 'Bash';
    /**
     * state running
     */
    export const LUA: SwfScriptType = 'Lua';
    /**
     * state rerunning
     */
    export const BATCH: SwfScriptType = 'Batch';

    /**
     * whether specified task script is bash or not
     * @param task task json
     * @return whether specified task script is bash or not
     */
    export function isBash(task: SwfTaskJson): boolean {
        return (task.script.type === this.BASH || path.extname(task.script.path) === '.sh');
    }

    /**
     * whether specified task script is batch or not
     * @param task task json
     * @return whether specified task script is batch or not
     */
    export function isBatch(task: SwfTaskJson): boolean {
        return (task.script.type === this.BATCH || path.extname(task.script.path) === '.bat');
    }

    /**
     * whether specified task script is lua or not
     * @param task task json
     * @return whether specified task script is lua or not
     */
    export function isLua(task: SwfTaskJson): boolean {
        return (task.script.type === this.LUA || path.extname(task.script.path) === '.lua');
    }
}

export = SwfScriptType;