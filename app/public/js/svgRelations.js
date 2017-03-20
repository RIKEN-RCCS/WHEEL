/**
 * task relations
 */
var SvgRelations = (function () {
    /**
     * create new instance
     * @param fileRelations task relation
     */
    function SvgRelations(relations) {
        this.relations = relations;
    }
    /**
     * get matched count
     * @param taskIndex task index
     * @return get matched count
     */
    SvgRelations.prototype.getTaskIndexCount = function (taskIndex) {
        return this.relations
            .filter(function (relation) { return (relation.index_before_task === taskIndex); })
            .length;
    };
    /**
     * initialize task relation
     * @param allLowers created all before task plugs
     * @param allUppers created all after task plugs
     */
    SvgRelations.prototype.initRelation = function (allLowers, allUppers) {
        if (this.relations == null) {
            return;
        }
        this.relations.forEach(function (relation) {
            var lowers = allLowers.findFromIndex(relation.index_before_task);
            var uppers = allUppers.findFromIndex(relation.index_after_task);
            if (lowers == null || uppers == null) {
                return;
            }
            lowers.forEach(function (lower) {
                if (lower.isConnect()) {
                    return;
                }
                uppers.forEach(function (upper) {
                    var isBind = false;
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
    };
    /**
     * create relation instance
     * @param upper before task plug
     * @param lower after task plug
     * @return relation instance
     */
    SvgRelations.prototype.createRelation = function (upper, lower) {
        if (upper == null || lower == null) {
            return null;
        }
        return new SwfRelation({
            index_before_task: lower.getTaskIndex(),
            index_after_task: upper.getTaskIndex()
        });
    };
    /**
     * add task relation
     * @param upper before task plug
     * @param lower after task plug
     */
    SvgRelations.prototype.addRelation = function (upper, lower) {
        var relation = this.createRelation(upper, lower);
        if (relation == null) {
            return;
        }
        this.deleteRelation(upper, lower);
        this.relations.push(relation);
    };
    /**
     * delete task relation
     * @param upper before task plug
     * @param lower after task plug
     */
    SvgRelations.prototype.deleteRelation = function (upper, lower) {
        var taskRelation = this.createRelation(upper, lower);
        if (taskRelation == null) {
            return;
        }
        for (var index = this.relations.length - 1; index >= 0; index--) {
            if (this.relations[index].toString() === taskRelation.toString()) {
                this.relations.splice(index, 1);
            }
        }
    };
    /**
     * clear all relations
     */
    SvgRelations.prototype.clear = function () {
        this.relations = [];
    };
    return SvgRelations;
}());
//# sourceMappingURL=svgRelations.js.map