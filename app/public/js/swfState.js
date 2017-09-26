/**
 * runnning state extension
 */
var SwfState;
(function (SwfState) {
    /**
     * state planning
     */
    SwfState.PLANNING = 'Planning';
    /**
     * state running
     */
    SwfState.RUNNING = 'Running';
    /**
     * state rerunning
     */
    SwfState.RERUNNING = 'ReRunning';
    /**
     * state waiting
     */
    SwfState.WAITING = 'Waiting';
    /**
     * state completed
     */
    SwfState.COMPLETED = 'Completed';
    /**
     * state failed
     */
    SwfState.FAILED = 'Failed';
    /**
     * get file status color string
     * @param state task status string
     * @return status color string
     */
    function getStateColor(state) {
        return config.state_color[state.toLowerCase()];
    }
    SwfState.getStateColor = getStateColor;
    /**
     * whether specified log json or project json is planning or not
     * @param json project json data or log json data
     * @return whether specified log json or project json is planning or not
     */
    function isPlanning(json) {
        return json.state === this.PLANNING;
    }
    SwfState.isPlanning = isPlanning;
    /**
     * whether specified log json or project json is running or not
     * @param json project json data or log json data
     * @return whether specified log json or project json is running or not
     */
    function isRunning(json) {
        return !this.isPlanning() && !this.isFinished();
    }
    SwfState.isRunning = isRunning;
    /**
     * whether specified log json or project json is finished or not
     * @param json project json data or log json data
     * @return whether specified log json or project json is finished or not
     */
    function isFinished(json) {
        return json.state === this.COMPLETED || json.state === this.FAILED;
    }
    SwfState.isFinished = isFinished;
})(SwfState || (SwfState = {}));
//# sourceMappingURL=swfState.js.map