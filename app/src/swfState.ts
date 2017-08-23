/**
 * running state
 */
type SwfState = 'Planning' | 'Running' | 'ReRunning' | 'Waiting' | 'Completed' | 'Failed';

/**
 * runnning state extension
 */
namespace SwfState {
    /**
     * state planning
     */
    export const PLANNING: SwfState = 'Planning';
    /**
     * state running
     */
    export const RUNNING: SwfState = 'Running';
    /**
     * state rerunning
     */
    export const RERUNNING: SwfState = 'ReRunning';
    /**
     * state waiting
     */
    export const WAITING: SwfState = 'Waiting';
    /**
     * state completed
     */
    export const COMPLETED: SwfState = 'Completed';
    /**
     * state failed
     */
    export const FAILED: SwfState = 'Failed';

    /**
     * whether specified log json or project json is planning or not
     * @param json project json data or log json data
     * @return whether specified log json or project json is planning or not
     */
    export function isPlanning(json: (SwfLogJson | SwfProjectJson)): boolean {
        return json.state === this.PLANNING;
    }

    /**
     * whether specified log json or project json is running or not
     * @param json project json data or log json data
     * @return whether specified log json or project json is running or not
     */
    export function isRunning(json: (SwfLogJson | SwfProjectJson)): boolean {
        return !this.isPlanning() && !this.isFinished();
    }

    /**
     * whether specified log json or project json is finished or not
     * @param json project json data or log json data
     * @return whether specified log json or project json is finished or not
     */
    export function isFinished(json: (SwfLogJson | SwfProjectJson)): boolean {
        return json.state === this.COMPLETED || json.state === this.FAILED;
    }
}

export = SwfState;