/**
 * file relations
 */
class SvgFileRelations {

    /**
     * file relation
     */
    private readonly fileRelations: SwfRelationFile[];

    /**
     * create new instance
     * @param fileRelations file relation
     */
    public constructor(fileRelations: SwfRelationFile[]) {
        this.fileRelations = fileRelations;
    }

    /**
     * get matched count
     * @param hashcode hash code
     * @param filepath relation file path name
     * @param dirname tree path name
     * @return get matched count
     */
    public getMatchedCount(hashcode: number, filepath: string, pathname: string): number {
        const filename = `${hashcode}_${pathname}/${ClientUtility.normalize(filepath)}`;
        return this.fileRelations
            .filter(relation => relation.getOutputFileName() === filename)
            .length;
    }

    /**
     * initialize file relation
     * @param allConnectors created all output file plugs
     * @param allReceptors created all input file plugs
     */
    public initFileRelation(allConnectors: SvgContainer, allReceptors: SvgContainer) {
        if (this.fileRelations == null) {
            return;
        }

        const relaltions: SwfRelationFile[] = JSON.parse(JSON.stringify(this.fileRelations));
        this.clear();
        relaltions.forEach(relation => {
            const connectors = <SvgConnector[]>allConnectors.findFromHashCode(relation.index_before_task, relation.path_output_file);
            const receptors = <SvgReceptor[]>allReceptors.findFromHashCode(relation.index_after_task, relation.path_input_file);

            if (connectors == null || receptors == null) {
                return;
            }
            connectors.forEach((connector, index) => {
                if (connector.isConnect()) {
                    return;
                }
                receptors.forEach(receptor => {
                    if (receptor.isConnect()) {
                        return;
                    }
                    if (!connector.connect(receptor)) {
                        this.deleteFileRelation(connector, receptor);
                    }
                    else {
                        this.addFileRelation(connector, receptor);
                    }
                });
            });
        });
    }

    /**
     * create file relation instance
     * @param connector output ifle plug
     * @param receptor input file plug
     * @return file relation instance
     */
    public createFileRelation(connector: SvgConnector, receptor: SvgReceptor): SwfRelationFile {
        if (connector == null || receptor == null) {
            return null;
        }

        const outputPath = ClientUtility.normalize(connector.parentDirname(), connector.getFilepath());
        const inputPath = ClientUtility.normalize(receptor.parentDirname(), receptor.getFilepath());

        const relation: SwfFileRelationJson = {
            index_before_task: connector.getHashCode(),
            path_output_file: `./${outputPath}`,
            index_after_task: receptor.getHashCode(),
            path_input_file: `./${inputPath}`,
        };
        return new SwfRelationFile(relation);
    }

    /**
     * add file relation
     * @param connector output ifle plug
     * @param receptor input file plug
     */
    public addFileRelation(connector: SvgConnector, receptor: SvgReceptor) {
        const relation = this.createFileRelation(connector, receptor);
        if (relation == null) {
            return;
        }
        this.deleteFileRelation(connector, receptor);
        this.fileRelations.push(relation);
    }

    /**
     * delete file relation
     * @param connector output ifle plug
     * @param receptor input file plug
     */
    public deleteFileRelation(connector: SvgConnector, receptor: SvgReceptor) {
        const fileRelation = this.createFileRelation(connector, receptor);
        if (fileRelation == null) {
            return;
        }
        for (let index = this.fileRelations.length - 1; index >= 0; index--) {
            if (this.fileRelations[index].toString() === fileRelation.toString()) {
                this.fileRelations.splice(index, 1);
            }
        }
    }

    /**
     * clear all relations
     */
    public clear() {
        this.fileRelations.splice(0, this.fileRelations.length);
    }
}