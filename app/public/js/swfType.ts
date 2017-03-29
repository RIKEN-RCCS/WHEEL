/**
 * json file type
 */
type SwfType = 'Project' | 'Workflow' | 'Task' | 'RemoteTask' | 'Job' | 'For' | 'If' | 'Else' | 'Condition' | 'Break' | 'PStudy';

/**
 * json file type extension
 */
namespace SwfType {
    /**
     * type of project
     */
    export const PROJECT: SwfType = 'Project';
    /**
     * type of workflow
     */
    export const WORKFLOW: SwfType = 'Workflow';
    /**
     * type of json
     */
    export const TASK: SwfType = 'Task';
    /**
     * type of remote task
     */
    export const REMOTETASK: SwfType = 'RemoteTask';
    /**
     * type of job
     */
    export const JOB: SwfType = 'Job';
    /**
     * type of for
     */
    export const FOR: SwfType = 'For';
    /**
     * type of if
     */
    export const IF: SwfType = 'If';
    /**
     * type of else
     */
    export const ELSE: SwfType = 'Else';
    /**
     * type of condition
     */
    export const CONDITION: SwfType = 'Condition';
    /**
     * type of break
     */
    export const BREAK: SwfType = 'Break';
    /**
     * type of pstudy
     */
    export const PSTUDY: SwfType = 'PStudy';

    /**
     * whether specified class has script or not
     * @param target SwfTree instance or SwfLog instance
     * @return whether specified class has script or not
     */
    export function isImplimentsWorkflow(target: (SwfLog | SwfTree)) {
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

    /**
     * whether specified class is condition or not
     * @param target SwfTree instance or SwfLog instance
     * @return whether specified class is condition or not
     */
    export function isImplimentsCondition(target: SwfTree): boolean {
        const conditionType = SwfType.CONDITION;
        const breakType = SwfType.BREAK;
        if (target.type.match(new RegExp(`^(?:${[conditionType, breakType].join('|')})$`))) {
            return true;
        }
        else {
            return false;
        }
    }
}