/**
 * task relations
 */
class SvgRelations {

    /**
     * task relation
     */
    private relations: SwfRelation[];

    /**
     * create new instance
     * @param fileRelations task relation
     */
    public constructor(relations: SwfRelation[]) {
        this.relations = relations;
    }

    /**
     * get matched count
     * @param taskIndex task index
     * @return get matched count
     */
    public getTaskIndexCount(taskIndex: number): number {
        return this.relations
            .filter(relation => (relation.index_before_task === taskIndex))
            .length;
    }

    /**
     * initialize task relation
     * @param allLowers created all before task plugs
     * @param allUppers created all after task plugs
     */
    public initRelation(allLowers: SvgContainer, allUppers: SvgContainer) {
        if (this.relations == null) {
            return;
        }

        this.relations.forEach(relation => {
            const lowers = <SvgLower[]>allLowers.findFromIndex(relation.index_before_task);
            const uppers = <SvgUpper[]>allUppers.findFromIndex(relation.index_after_task);

            if (lowers == null || uppers == null) {
                return;
            }

            lowers.forEach(lower => {
                if (lower.isConnect()) {
                    return;
                }
                uppers.forEach(upper => {
                    let isBind = false;
                    if (ClientUtility.checkFileType(lower.getType(), JsonFileType.If)) {
                        if (ClientUtility.checkFileType(upper.getType(), JsonFileType.Else)) {
                            if (lower.getTaskIndex() + 1 === upper.getTaskIndex()) {
                                isBind = true;
                            }
                        }
                    }
                    lower.connect(upper, isBind);
                });
            });
        });
    }

    /**
     * create relation instance
     * @param upper before task plug
     * @param lower after task plug
     * @return relation instance
     */
    public createRelation(upper: SvgUpper, lower: SvgLower): SwfRelation {
        if (upper == null || lower == null) {
            return null;
        }
        return new SwfRelation({
            index_before_task: lower.getTaskIndex(),
            index_after_task: upper.getTaskIndex()
        });
    }

    /**
     * add task relation
     * @param upper before task plug
     * @param lower after task plug
     */
    public addRelation(upper: SvgUpper, lower: SvgLower) {
        const relation = this.createRelation(upper, lower);
        if (relation == null) {
            return;
        }
        this.deleteRelation(upper, lower);
        this.relations.push(relation);
    }

    /**
     * delete task relation
     * @param upper before task plug
     * @param lower after task plug
     */
    public deleteRelation(upper: SvgUpper, lower: SvgLower) {
        const taskRelation = this.createRelation(upper, lower);
        if (taskRelation == null) {
            return;
        }
        for (let index = this.relations.length - 1; index >= 0; index--) {
            if (this.relations[index].toString() === taskRelation.toString()) {
                this.relations.splice(index, 1);
            }
        }
    }

    /**
     * clear all relations
     */
    public clear() {
        this.relations = [];
    }
}