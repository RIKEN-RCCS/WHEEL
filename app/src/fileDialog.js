import $ from 'jquery';
import config from './config';

/**
 * File dialog class
 */
export default class {
    /**
     * create file dialog instance
     * @param socket socket io communication class for getting file list
     */
    constructor(socket) {
        /**
         * gray panel element
         */
        this.grayPanel = $('#gray_panel');
        /**
         * dialog frame area element
         */
        this.dialogArea = $('#dialog_area_browse');
        /**
         * input text element
         */
        this.inputText = $('#input_text_browse');
        /**
         * ok button element
         */
        this.buttonOK = $('#dialog_ok_button_browse');
        /**
         * cancel button element
         */
        this.buttonCancel = $('#dialog_cancel_button_browse');
        /**
         * address bar element
         */
        this.addressBar = $('#address_bar');
        /**
         * display file icon element
         */
        this.displayIconArea = $('#file_dialog');
        /**
         * current display directory
         */
        this.currentDirectory = null;
        /**
         * last select directory
         */
        this.lastSelectDirectory = null;
        /**
         * last select file
         */
        this.lastSelectFilepath = null;
        /**
         * key pressed flag
         */
        this.keyPressedFlag = false;
        this.socket = socket;
        this.grayPanel.click(() => this.hide());
    }
    /**
     * get last select directory
     * @return get last select directory
     */
    getLastSelectDirectory() {
        return this.lastSelectDirectory;
    }
    /**
     * get last select file path
     * @return get last select file path
     */
    getLastSelectFilepath() {
        if (this.lastSelectFilepath) {
            return this.lastSelectFilepath;
        }
        else {
            return undefined;
        }
    }
    /**
     * create html string for all file icon
     * @param fileTypes all file types interface
     * @return html string for all file icon
     */
    createHtml4FileIcon(fileTypes) {
        const regexp = new RegExp(`${config.extension.project.replace('.', '\\.')}$`);
        const htmls = fileTypes.files
            .filter(file => file.type === SwfFileType.FILE)
            .map(file => {
            let htmlImage;
            if (file.name.match(regexp)) {
                htmlImage = '<img class="project_icon" src="/image/icon_workflow.png" />';
            }
            else {
                htmlImage = '<img class="file_icon" src="/image/icon_file.png" />';
            }
            return `
                    <div class="select_file_container" id="${fileTypes.directory}${file.name}_file" onMouseDown="return false;">
                        ${htmlImage}
                        <p>${file.name}</p>
                    </div>`;
        });
        return htmls.join('');
    }
    /**
     * create html string for all directory icon
     * @param fileTypes all file types interface
     * @return html string for all directory icon
     */
    createHtml4DirIcon(fileTypes) {
        const htmls = fileTypes.files
            .filter(file => file.type === SwfFileType.DIRECTORY)
            .map(file => {
            return `
                    <div class="select_dir_container" id="${fileTypes.directory}${file.name}_dir" onMouseDown="return false;">
                        <img class="dir_icon" src="/image/icon_dir.png" />
                        <p>${file.name}</p>
                    </div>`;
        });
        return htmls.join('');
    }
    /**
     * Adds a listener for directory icon double click event
     * @param callback The function to call when we get directory icon double click event
     * @return FileDialog class instance
     */
    onDirIconDblClick(callback) {
        $(document).on('dblclick', '[id$=_dir]', (eventObject) => {
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
     * Adds a listener for directory icon mouseup event
     * @param callback The function to call when we get directory icon mouseup event
     * @return FileDialog class instance
     */
    onDirIconMouseup(callback) {
        $(document).on('mouseup', '[id$=_dir]', (eventObject) => {
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
     * Adds a listener for file icon double click event
     * @param callback The function to call when we get file icon double click event
     * @return FileDialog class instance
     */
    onFileIconDblClick(callback) {
        $(document).on('dblclick', '[id$=_file]', (eventObject) => {
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
     * Adds a listener for file icon mouseup event
     * @param callback The function to call when we get file icon mouseup event
     * @return FileDialog class instance
     */
    onFileIconMouseup(callback) {
        $(document).on('mouseup', '[id$=_file]', (eventObject) => {
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
     * Adds a listener for address change event
     * @param callback The function to call when we get address change event
     * @return FileDialog class instance
     */
    onChangeAddress(callback) {
        this.addressBar.change(() => {
            this.lastSelectDirectory = this.addressBar.val();
            this.updateDialog();
            if (callback) {
                callback();
            }
        });
        return this;
    }
    /**
     * update file dialog list
     * @return FileDialog class instance
     */
    updateDialog() {
        const directory = this.lastSelectDirectory || this.currentDirectory;
        this.socket.emit(directory, (fileTypes) => {
            if (fileTypes == null) {
                console.error('address is not found');
                this.addressBar.borderInvalid();
                return;
            }
            const directoryIconHtml = this.createHtml4DirIcon(fileTypes);
            const fileIconHtml = this.createHtml4FileIcon(fileTypes);
            this.displayIconArea.empty();
            this.displayIconArea.html(directoryIconHtml + fileIconHtml);
            this.addressBar.val(fileTypes.directory);
            this.addressBar.borderValid();
            this.lastSelectDirectory = fileTypes.directory;
            this.currentDirectory = fileTypes.directory;
        });
        return this;
    }
    /**
     * get selected icon element
     * @param eventObject event fired object
     * @return selected JQuery object
     */
    getSelectIconElement(eventObject) {
        let element;
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
     * clear selected rectangle
     * @return FileDialog class instance
     */
    clearSelectIcon() {
        $('.select_dir_container,.select_file_container').each((index, element) => {
            $(element).css('border', 'solid 1px rgba(0, 0, 0, 0)');
        });
        return this;
    }
    /**
     * Adds a listener for ok button click event
     * @param callback The function to call when we get ok button click event
     * @return FileDialog class instance
     */
    onClickOK(callback) {
        if (!this.clickOkCallback) {
            this.clickOkCallback = callback;
        }
        return this;
    }
    /**
     * Adds a listener for cancel button click event
     * @param callback The function to call when we get cancel button click event
     * @return FileDialog class instance
     */
    onClickCancel(callback) {
        if (!this.clickCancelCallback) {
            this.clickCancelCallback = callback;
        }
        return this;
    }
    /**
     * show dialog
     * @return FileDialog class instance
     */
    show() {
        this.keyPressedFlag = false;
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
        this.inputText.on('keypress', () => {
            this.keyPressedFlag = true;
        });
        this.inputText.on('keyup', (eventObject) => {
            const ENTER_KEY = 0x0D;
            if (eventObject.which === ENTER_KEY && this.clickOkCallback && this.keyPressedFlag) {
                this.clickOkCallback(this.inputText);
            }
            this.keyPressedFlag = false;
        });
        return this;
    }
    /**
     * hide dialog
     * @return FileDialog class instance
     */
    hide() {
        this.lastSelectDirectory = this.currentDirectory;
        this.grayPanel.displayNone();
        this.dialogArea.displayNone();
        this.inputText.val('');
        this.inputText.borderValid();
        this.buttonOK.off('click');
        this.buttonCancel.off('click');
        this.inputText.off('keyup');
        this.inputText.off('keypress');
        return this;
    }
}
//# sourceMappingURL=fileDialog.js.map
