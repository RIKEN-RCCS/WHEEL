/**
 *
 */
class FileDialog implements DialogBase<FileDialog> {

    /**
     *
     */
    public grayPanel: JQuery = $('#gray_panel');

    /**
     *
     */
    public dialogArea: JQuery = $('#dialog_area_browse');

    /**
     *
     */
    public inputText: JQuery = $('#input_text_browse');

    /**
     *
     */
    public buttonOK: JQuery = $('#dialog_ok_button_browse');

    /**
     *
     */
    public buttonCancel: JQuery = $('#dialog_cancel_button_browse');

    /**
     *
     */
    private socket: GetFileListSocket;

    /**
     *
     */
    private addressBar = $('#address_bar');

    /**
     *
     */
    private fileDialog = $('#file_dialog');

    /**
     *
     */
    private currentDirectory: string = null;

    /**
     *
     */
    private lastSelectDirectory: string = null;

    /**
     *
     */
    private lastSelectFilepath: string = null;

    /**
     *
     */
    private clickOkCallback: ((inputTextElement: JQuery) => void);

    /**
     *
     */
    private clickCancelCallback;

    /**
     *
     * @param socket
     * @param dialogAreaName
     */
    public constructor(socket: GetFileListSocket) {
        this.socket = socket;
        this.grayPanel.click(() => this.hide());
    }

    /**
     *
     * @returns
     */
    public getLastSelectDirectory(): string {
        return this.lastSelectDirectory;
    }

    /**
     *
     */
    public getLastSelectFilepath(): string {
        if (this.lastSelectFilepath) {
            return this.lastSelectFilepath;
        }
        else {
            return undefined;
        }
    }

    /**
     *
     * @param directoryPath
     * @param filename
     * @returns html string
     */
    private getFileIconHtml(directoryPath: string, filename: string): string {
        return `
        <div class="select_file_container" id="${directoryPath}${filename}_file" onMouseDown="return false;">
            <img class="file_icon" src="/image/icon_file.png" />
            <p>${filename}</p>
        </div>`;
    };

    /**
     *
     * @param directoryPath
     * @param dirname
     * @return html string
     */
    private getDirectoryIconHtml(directoryPath: string, dirname: string): string {
        return `
        <div class="select_dir_container" id="${directoryPath}${dirname}_dir" onMouseDown="return false;">
            <img class="dir_icon" src="/image/icon_dir.png" />
            <p>${dirname}</p>
        </div>`;
    };

    /**
     *
     * @param fileTypes
     */
    private createHtml4FileIcon(fileTypes: FileTypeList): string {
        const html: string[] = [];
        fileTypes.files
            .filter(file => file.type === 'file')
            .forEach(file => html.push(this.getFileIconHtml(fileTypes.directory, file.name)));
        return html.join('');
    }

    /**
     *
     * @param fileTypes
     */
    private createHtml4DirIcon(fileTypes: FileTypeList): string {
        const html: string[] = [];
        fileTypes.files
            .filter(file => file.type === 'dir')
            .forEach(file => html.push(this.getDirectoryIconHtml(fileTypes.directory, file.name)));
        return html.join('');
    }

    /**
     *
     * @param callback
     */
    public onDirIconDblClick(callback?: ((text: string) => void)): FileDialog {
        $(document).on('dblclick', '[id$=_dir]', (eventObject: JQueryEventObject) => {
            const element = this.getSelectIconElement(eventObject);
            const directory = element.id().replace(new RegExp(`_dir$`), '');
            this.lastSelectFilepath = null;
            this.lastSelectDirectory = directory;
            this.updateDialog();
            if (callback) {
                callback(directory);
            }
        });
        return this;
    }

    /**
     *
     * @param callback
     */
    public onDirIconMouseup(callback?: ((text: string) => void)): FileDialog {
        $(document).on('mouseup', '[id$=_dir]', (eventObject: JQueryEventObject) => {
            const element = this.getSelectIconElement(eventObject);
            const directory = element.id().replace(new RegExp(`_dir$`), '');
            this.lastSelectFilepath = null;
            this.lastSelectDirectory = directory;
            if (callback != null) {
                callback(directory);
            }
        });
        return this;
    }

    /**
     *
     * @param callback
     */
    public onFileIconDblClick(callback?: ((text: string) => void)): FileDialog {
        $(document).on('dblclick', '[id$=_file]', (eventObject: JQueryEventObject) => {
            const element = this.getSelectIconElement(eventObject);
            const filepath = element.id().replace(new RegExp(`_file$`), '');
            const normalizePath = ClientUtility.normalize(filepath);
            this.lastSelectDirectory = null;
            this.lastSelectFilepath = filepath;
            if (callback != null) {
                callback(filepath);
            }
        });
        return this;
    }

    /**
     *
     * @param callback
     */
    public onFileIconMouseup(callback?: ((text: string) => void)): FileDialog {
        $(document).on('mouseup', '[id$=_file]', (eventObject: JQueryEventObject) => {
            const element = this.getSelectIconElement(eventObject);
            const filepath = element.id().replace(new RegExp(`_file$`), '');
            const normalizePath = ClientUtility.normalize(filepath);
            this.lastSelectDirectory = null;
            this.lastSelectFilepath = filepath;
            if (callback != null) {
                callback(filepath);
            }
        });
        return this;
    }

    /**
     *
     * @param callback
     */
    public onChangeAddress(callback?: Function): FileDialog {
        this.addressBar.change(() => {
            this.updateDialog();
            if (callback) {
                callback();
            }
        })
        return this;
    }

    /**
     *
     */
    public updateDialog() {
        const directory: string = this.lastSelectDirectory || this.currentDirectory;
        this.socket.emit(directory, (fileTypes: FileTypeList) => {
            if (fileTypes == null) {
                console.error('address is not found');
                this.addressBar.borderInvalid();
                return;
            }
            const directoryIconHtml = this.createHtml4DirIcon(fileTypes);
            const fileIconHtml = this.createHtml4FileIcon(fileTypes);
            this.fileDialog.html(directoryIconHtml + fileIconHtml);
            this.addressBar.val(fileTypes.directory);
            this.addressBar.borderValid();
            this.lastSelectDirectory = fileTypes.directory
            this.currentDirectory = fileTypes.directory;
        });
    }

    /**
     *
     * @param eventObject
     */
    private getSelectIconElement(eventObject: JQueryEventObject): JQuery {
        let element: JQuery;
        if (eventObject.target.id) {
            element = $(eventObject.target);
        }
        else {
            element = $(eventObject.target.parentElement);
        }
        this.clearSelectIcon();
        element.css('border', 'solid 1px rgb(105, 175, 45)');
        return element;
    }

    /**
     *
     */
    private clearSelectIcon(): void {
        $('.select_dir_container,.select_file_container').each((index, element) => {
            $(element).css('border', 'solid 1px rgba(0, 0, 0, 0)');
        });
    }

    /**
     *
     * @param callback
     */
    public onClickOK(callback?: (inputTextElement: JQuery) => void): FileDialog {
        if (!this.clickOkCallback) {
            this.clickOkCallback = callback;
        }
        return this;
    }

    /**
     *
     * @param callback
     */
    public onClickCancel(callback?: Function): FileDialog {
        if (!this.clickCancelCallback) {
            this.clickCancelCallback = callback;
        }
        return this;
    }

    /**
     *
     */
    public show(): FileDialog {
        this.lastSelectFilepath = null;
        this.lastSelectDirectory = null;
        this.inputText.val('');
        this.inputText.borderValid();
        this.grayPanel.displayBlock();
        this.dialogArea.displayBlock();
        this.buttonOK.on('click', () => {
            if (this.clickOkCallback) {
                this.clickOkCallback(this.inputText);
            }
        });
        this.buttonCancel.one('click', () => {
            if (this.clickCancelCallback) {
                this.clickCancelCallback();
            }
            this.hide();
        });
        this.inputText.on('keyup', (eventObject: JQueryEventObject) => {
            if (eventObject.which === 0x0D && this.clickOkCallback) {
                this.clickOkCallback(this.inputText);
            }
        });
        return this;
    }

    /**
     *
     */
    public hide(): FileDialog {
        this.lastSelectDirectory = this.currentDirectory;
        this.grayPanel.displayNone();
        this.dialogArea.displayNone();
        this.inputText.val('');
        this.inputText.borderValid();
        this.buttonOK.off('click');
        this.buttonCancel.off('click');
        this.inputText.off('keyup');
        return this;
    }
}