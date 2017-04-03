/**
 * type of scheduler
 */
type SwfJobScheduler = 'TCS' | 'TORQUE';

/**
 * runnning state extension
 */
namespace SwfJobScheduler {
    /**
     * state planning
     */
    export const TCS: SwfJobScheduler = 'TCS';
    /**
     * state running
     */
    export const TORQUE: SwfJobScheduler = 'TORQUE';
}

export = SwfJobScheduler;