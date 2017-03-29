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
}

export = SwfState;