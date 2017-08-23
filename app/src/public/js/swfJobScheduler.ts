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

    /**
     * get all schedulers
     * @return all schedulers
     */
    export function schedulers(): string[] {
        return [this.TCS, this.TORQUE];
    }
}