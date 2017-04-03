/**
 * runnning state extension
 */
var SwfJobScheduler;
(function (SwfJobScheduler) {
    /**
     * state planning
     */
    SwfJobScheduler.TCS = 'TCS';
    /**
     * state running
     */
    SwfJobScheduler.TORQUE = 'TORQUE';
    /**
     * get all schedulers
     * @return all schedulers
     */
    function schedulers() {
        return [this.TCS, this.TORQUE];
    }
    SwfJobScheduler.schedulers = schedulers;
})(SwfJobScheduler || (SwfJobScheduler = {}));
//# sourceMappingURL=swfJobScheduler.js.map