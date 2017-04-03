/**
 * file relations
 */
var SvgFileRelations = (function () {
    /**
     * create new instance
     * @param fileRelations file relation
     */
    function SvgFileRelations(fileRelations) {
        this.fileRelations = fileRelations;
    }
    /**
     * get matched count
     * @param hashcode hash code
     * @param filepath relation file path name
     * @param dirname tree path name
     * @return get matched count
     */
    SvgFileRelations.prototype.getMatchedCount = function (hashcode, filepath, pathname) {
        var filename = hashcode + "_" + pathname + "/" + ClientUtility.normalize(filepath);
        return this.fileRelations
            .filter(function (relation) { return relation.getOutputFileName() === filename; })
            .length;
    };
    /**
     * initialize file relation
     * @param allConnectors created all output file plugs
     * @param allReceptors created all input file plugs
     */
    SvgFileRelations.prototype.initFileRelation = function (allConnectors, allReceptors) {
        var _this = this;
        if (this.fileRelations == null) {
            return;
        }
        var relaltions = JSON.parse(JSON.stringify(this.fileRelations));
        this.clear();
        relaltions.forEach(function (relation) {
            var connectors = allConnectors.findFromHashCode(relation.index_before_task, relation.path_output_file);
            var receptors = allReceptors.findFromHashCode(relation.index_after_task, relation.path_input_file);
            if (connectors == null || receptors == null) {
                return;
            }
            connectors.forEach(function (connector, index) {
                if (connector.isConnect()) {
                    return;
                }
                receptors.forEach(function (receptor) {
                    if (receptor.isConnect()) {
                        return;
                    }
                    if (!connector.connect(receptor)) {
                        _this.deleteFileRelation(connector, receptor);
                    }
                    else {
                        _this.addFileRelation(connector, receptor);
                    }
                });
            });
        });
    };
    /**
     * create file relation instance
     * @param connector output ifle plug
     * @param receptor input file plug
     * @return file relation instance
     */
    SvgFileRelations.prototype.createFileRelation = function (connector, receptor) {
        if (connector == null || receptor == null) {
            return null;
        }
        var outputPath = ClientUtility.normalize(connector.parentDirname(), connector.getFilepath());
        var inputPath = ClientUtility.normalize(receptor.parentDirname(), receptor.getFilepath());
        var relation = {
            index_before_task: connector.getHashCode(),
            path_output_file: "./" + outputPath,
            index_after_task: receptor.getHashCode(),
            path_input_file: "./" + inputPath,
        };
        return new SwfRelationFile(relation);
    };
    /**
     * add file relation
     * @param connector output ifle plug
     * @param receptor input file plug
     */
    SvgFileRelations.prototype.addFileRelation = function (connector, receptor) {
        var relation = this.createFileRelation(connector, receptor);
        if (relation == null) {
            return;
        }
        this.deleteFileRelation(connector, receptor);
        this.fileRelations.push(relation);
    };
    /**
     * delete file relation
     * @param connector output ifle plug
     * @param receptor input file plug
     */
    SvgFileRelations.prototype.deleteFileRelation = function (connector, receptor) {
        var fileRelation = this.createFileRelation(connector, receptor);
        if (fileRelation == null) {
            return;
        }
        for (var index = this.fileRelations.length - 1; index >= 0; index--) {
            if (this.fileRelations[index].toString() === fileRelation.toString()) {
                this.fileRelations.splice(index, 1);
            }
        }
    };
    /**
     * clear all relations
     */
    SvgFileRelations.prototype.clear = function () {
        this.fileRelations.splice(0, this.fileRelations.length);
    };
    return SvgFileRelations;
}());
//# sourceMappingURL=svgFileRelations.js.map