/**
 * File dialog class
 */
var FileDialog = (function () {
    /**
     * create file dialog instance
     * @param socket socket io communication class for getting file list
     */
    function FileDialog(socket) {
        var _this = this;
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
        this.grayPanel.click(function () { return _this.hide(); });
    }
    /**
     * get last select directory
     * @return get last select directory
     */
    FileDialog.prototype.getLastSelectDirectory = function () {
        return this.lastSelectDirectory;
    };
    /**
     * get last select file path
     * @return get last select file path
     */
    FileDialog.prototype.getLastSelectFilepath = function () {
        if (this.lastSelectFilepath) {
            return this.lastSelectFilepath;
        }
        else {
            return undefined;
        }
    };
    /**
     * create html string for all file icon
     * @param fileTypes all file types interface
     * @return html string for all file icon
     */
    FileDialog.prototype.createHtml4FileIcon = function (fileTypes) {
        var regexp = new RegExp(config.extension.project.replace('.', '\\.') + "$");
        var htmls = fileTypes.files
            .filter(function (file) { return file.type === 'file'; })
            .map(function (file) {
            var htmlImage;
            if (file.name.match(regexp)) {
                htmlImage = '<img class="project_icon" src="/image/icon_workflow.png" />';
            }
            else {
                htmlImage = '<img class="file_icon" src="/image/icon_file.png" />';
            }
            return "\n                    <div class=\"select_file_container\" id=\"" + fileTypes.directory + file.name + "_file\" onMouseDown=\"return false;\">\n                        " + htmlImage + "\n                        <p>" + file.name + "</p>\n                    </div>";
        });
        return htmls.join('');
    };
    /**
     * create html string for all directory icon
     * @param fileTypes all file types interface
     * @return html string for all directory icon
     */
    FileDialog.prototype.createHtml4DirIcon = function (fileTypes) {
        var htmls = fileTypes.files
            .filter(function (file) { return file.type === 'dir'; })
            .map(function (file) {
            return "\n                    <div class=\"select_dir_container\" id=\"" + fileTypes.directory + file.name + "_dir\" onMouseDown=\"return false;\">\n                        <img class=\"dir_icon\" src=\"/image/icon_dir.png\" />\n                        <p>" + file.name + "</p>\n                    </div>";
        });
        return htmls.join('');
    };
    /**
     * Adds a listener for directory icon double click event
     * @param callback The function to call when we get directory icon double click event
     * @return FileDialog class instance
     */
    FileDialog.prototype.onDirIconDblClick = function (callback) {
        var _this = this;
        $(document).on('dblclick', '[id$=_dir]', function (eventObject) {
            var element = _this.getSelectIconElement(eventObject);
            var directory = element.id().replace(new RegExp("_dir$"), '');
            _this.lastSelectFilepath = null;
            _this.lastSelectDirectory = directory;
            _this.updateDialog();
            if (callback) {
                callback(directory);
            }
        });
        return this;
    };
    /**
     * Adds a listener for directory icon mouseup event
     * @param callback The function to call when we get directory icon mouseup event
     * @return FileDialog class instance
     */
    FileDialog.prototype.onDirIconMouseup = function (callback) {
        var _this = this;
        $(document).on('mouseup', '[id$=_dir]', function (eventObject) {
            var element = _this.getSelectIconElement(eventObject);
            var directory = element.id().replace(new RegExp("_dir$"), '');
            _this.lastSelectFilepath = null;
            _this.lastSelectDirectory = directory;
            if (callback != null) {
                callback(directory);
            }
        });
        return this;
    };
    /**
     * Adds a listener for file icon double click event
     * @param callback The function to call when we get file icon double click event
     * @return FileDialog class instance
     */
    FileDialog.prototype.onFileIconDblClick = function (callback) {
        var _this = this;
        $(document).on('dblclick', '[id$=_file]', function (eventObject) {
            var element = _this.getSelectIconElement(eventObject);
            var filepath = element.id().replace(new RegExp("_file$"), '');
            var normalizePath = ClientUtility.normalize(filepath);
            _this.lastSelectDirectory = null;
            _this.lastSelectFilepath = filepath;
            if (callback != null) {
                callback(filepath);
            }
        });
        return this;
    };
    /**
     * Adds a listener for file icon mouseup event
     * @param callback The function to call when we get file icon mouseup event
     * @return FileDialog class instance
     */
    FileDialog.prototype.onFileIconMouseup = function (callback) {
        var _this = this;
        $(document).on('mouseup', '[id$=_file]', function (eventObject) {
            var element = _this.getSelectIconElement(eventObject);
            var filepath = element.id().replace(new RegExp("_file$"), '');
            var normalizePath = ClientUtility.normalize(filepath);
            _this.lastSelectDirectory = null;
            _this.lastSelectFilepath = filepath;
            if (callback != null) {
                callback(filepath);
            }
        });
        return this;
    };
    /**
     * Adds a listener for address change event
     * @param callback The function to call when we get address change event
     * @return FileDialog class instance
     */
    FileDialog.prototype.onChangeAddress = function (callback) {
        var _this = this;
        this.addressBar.change(function () {
            _this.lastSelectDirectory = _this.addressBar.val();
            _this.updateDialog();
            if (callback) {
                callback();
            }
        });
        return this;
    };
    /**
     * update file dialog list
     * @return FileDialog class instance
     */
    FileDialog.prototype.updateDialog = function () {
        var _this = this;
        var directory = this.lastSelectDirectory || this.currentDirectory;
        this.socket.emit(directory, function (fileTypes) {
            if (fileTypes == null) {
                console.error('address is not found');
                _this.addressBar.borderInvalid();
                return;
            }
            var directoryIconHtml = _this.createHtml4DirIcon(fileTypes);
            var fileIconHtml = _this.createHtml4FileIcon(fileTypes);
            _this.displayIconArea.empty();
            _this.displayIconArea.html(directoryIconHtml + fileIconHtml);
            _this.addressBar.val(fileTypes.directory);
            _this.addressBar.borderValid();
            _this.lastSelectDirectory = fileTypes.directory;
            _this.currentDirectory = fileTypes.directory;
        });
        return this;
    };
    /**
     * get selected icon element
     * @param eventObject event fired object
     * @return selected JQuery object
     */
    FileDialog.prototype.getSelectIconElement = function (eventObject) {
        var element;
        if (eventObject.target.id) {
            element = $(eventObject.target);
        }
        else {
            element = $(eventObject.target.parentElement);
        }
        this.clearSelectIcon();
        element.css('border', 'solid 1px rgb(105, 175, 45)');
        return element;
    };
    /**
     * clear selected rectangle
     * @return FileDialog class instance
     */
    FileDialog.prototype.clearSelectIcon = function () {
        $('.select_dir_container,.select_file_container').each(function (index, element) {
            $(element).css('border', 'solid 1px rgba(0, 0, 0, 0)');
        });
        return this;
    };
    /**
     * Adds a listener for ok button click event
     * @param callback The function to call when we get ok button click event
     * @return FileDialog class instance
     */
    FileDialog.prototype.onClickOK = function (callback) {
        if (!this.clickOkCallback) {
            this.clickOkCallback = callback;
        }
        return this;
    };
    /**
     * Adds a listener for cancel button click event
     * @param callback The function to call when we get cancel button click event
     * @return FileDialog class instance
     */
    FileDialog.prototype.onClickCancel = function (callback) {
        if (!this.clickCancelCallback) {
            this.clickCancelCallback = callback;
        }
        return this;
    };
    /**
     * show dialog
     * @return FileDialog class instance
     */
    FileDialog.prototype.show = function () {
        var _this = this;
        this.keyPressedFlag = false;
        this.lastSelectFilepath = null;
        this.lastSelectDirectory = null;
        this.inputText.val('');
        this.inputText.borderValid();
        this.grayPanel.displayBlock();
        this.dialogArea.displayBlock();
        this.buttonOK.on('click', function () {
            if (_this.clickOkCallback) {
                _this.clickOkCallback(_this.inputText);
            }
        });
        this.buttonCancel.one('click', function () {
            if (_this.clickCancelCallback) {
                _this.clickCancelCallback();
            }
            _this.hide();
        });
        this.inputText.on('keypress', function () {
            _this.keyPressedFlag = true;
        });
        this.inputText.on('keyup', function (eventObject) {
            var ENTER_KEY = 0x0D;
            if (eventObject.which === ENTER_KEY && _this.clickOkCallback && _this.keyPressedFlag) {
                _this.clickOkCallback(_this.inputText);
            }
            _this.keyPressedFlag = false;
        });
        return this;
    };
    /**
     * hide dialog
     * @return FileDialog class instance
     */
    FileDialog.prototype.hide = function () {
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
    };
    return FileDialog;
}());
//# sourceMappingURL=fileDialog.js.map