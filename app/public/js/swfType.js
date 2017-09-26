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
        const workflowType = SwfType.WORKFLOW;
        const ForType = SwfType.FOR;
        const ifType = SwfType.IF;
        const elseType = SwfType.ELSE;
        const pstudyType = SwfType.PSTUDY;
        if (target.type.match(new RegExp(`^(?:${[workflowType, ForType, ifType, elseType, pstudyType].join('|')})$`))) {
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
    function isImplimentsCondition(tree) {
        const conditionType = SwfType.CONDITION;
        const breakType = SwfType.BREAK;
        if (tree.type.match(new RegExp(`^(?:${[conditionType, breakType].join('|')})$`))) {
            return true;
        }
        else {
            return false;
        }
    }
    SwfType.isImplimentsCondition = isImplimentsCondition;
    /**
     * get type string
     * @param target SwfTree instance or string
     * @return type string
     */
    function getType(target) {
        if (typeof target === 'string') {
            return target;
        }
        else {
            return target.type;
        }
    }
    SwfType.getType = getType;
    /**
     * whether specified tree is 'Condition' or not
     * @param target SwfTree instance or string
     * @return whether specified tree is 'Condition' or not
     */
    function isCondition(target) {
        return this.getType(target) === this.CONDITION;
    }
    SwfType.isCondition = isCondition;
    /**
     * whether specified tree is 'If' or not
     * @param target SwfTree instance or string
     * @return whether specified tree is 'If' or not
     */
    function isIf(target) {
        return this.getType(target) === this.IF;
    }
    SwfType.isIf = isIf;
    /**
     * whether specified tree is 'Else' or not
     * @param target SwfTree instance or string
     * @return whether specified tree is 'Else' or not
     */
    function isElse(target) {
        return this.getType(target) === this.ELSE;
    }
    SwfType.isElse = isElse;
    /**
     * whether specified tree is 'For' or not
     * @param target SwfTree instance or string
     * @return whether specified tree is 'For' or not
     */
    function isFor(target) {
        return this.getType(target) === this.FOR;
    }
    SwfType.isFor = isFor;
    /**
     * whether specified tree is 'Job' or not
     * @param target SwfTree instance or string
     * @return whether specified tree is 'Job' or not
     */
    function isJob(target) {
        return this.getType(target) === this.JOB;
    }
    SwfType.isJob = isJob;
})(SwfType || (SwfType = {}));
//# sourceMappingURL=swfType.js.map