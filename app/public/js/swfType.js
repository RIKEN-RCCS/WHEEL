/**
 * json file type extension
 */
var SwfType;
(function (SwfType) {
    /**
     * type of project
     */
    SwfType.PROJECT = 'Project';
    /**
     * type of workflow
     */
    SwfType.WORKFLOW = 'Workflow';
    /**
     * type of json
     */
    SwfType.TASK = 'Task';
    /**
     * type of remote task
     */
    SwfType.REMOTETASK = 'RemoteTask';
    /**
     * type of job
     */
    SwfType.JOB = 'Job';
    /**
     * type of for
     */
    SwfType.FOR = 'For';
    /**
     * type of if
     */
    SwfType.IF = 'If';
    /**
     * type of else
     */
    SwfType.ELSE = 'Else';
    /**
     * type of condition
     */
    SwfType.CONDITION = 'Condition';
    /**
     * type of break
     */
    SwfType.BREAK = 'Break';
    /**
     * type of pstudy
     */
    SwfType.PSTUDY = 'PStudy';
    /**
     * whether specified class has script or not
     * @param target SwfTree instance or SwfLog instance
     * @return whether specified class has script or not
     */
    function isImplimentsWorkflow(target) {
        var workflowType = SwfType.WORKFLOW;
        var ForType = SwfType.FOR;
        var ifType = SwfType.IF;
        var elseType = SwfType.ELSE;
        var pstudyType = SwfType.PSTUDY;
        if (target.type.match(new RegExp("^(?:" + [workflowType, ForType, ifType, elseType, pstudyType].join('|') + ")$"))) {
            return true;
        }
        else {
            return false;
        }
    }
    SwfType.isImplimentsWorkflow = isImplimentsWorkflow;
    /**
     * whether specified class is condition or not
     * @param target SwfTree instance or SwfLog instance
     * @return whether specified class is condition or not
     */
    function isImplimentsCondition(target) {
        var conditionType = SwfType.CONDITION;
        var breakType = SwfType.BREAK;
        if (target.type.match(new RegExp("^(?:" + [conditionType, breakType].join('|') + ")$"))) {
            return true;
        }
        else {
            return false;
        }
    }
    SwfType.isImplimentsCondition = isImplimentsCondition;
})(SwfType || (SwfType = {}));
//# sourceMappingURL=swfType.js.map