/**
 *
 */
var FileDialog = (function () {
    /**
     *
     * @param socket
     * @param dialogAreaName
     */
    function FileDialog(socket) {
        var _this = this;
        /**
         *
         */
        this.grayPanel = $('#gray_panel');
        /**
         *
         */
        this.dialogArea = $('#dialog_area_browse');
        /**
         *
         */
        this.inputText = $('#input_text_browse');
        /**
         *
         */
        this.buttonOK = $('#dialog_ok_button_browse');
        /**
         *
         */
        this.buttonCancel = $('#dialog_cancel_button_browse');
        /**
         *
         */
        this.addressBar = $('#address_bar');
        /**
         *
         */
        this.fileDialog = $('#file_dialog');
        /**
         *
         */
        this.currentDirectory = null;
        /**
         *
         */
        this.lastSelectDirectory = null;
        /**
         *
         */
        this.lastSelectFilepath = null;
        this.socket = socket;
        this.grayPanel.click(function () { return _this.hide(); });
    }
    /**
     *
     * @returns
     */
    FileDialog.prototype.getLastSelectDirectory = function () {
        return this.lastSelectDirectory;
    };
    /**
     *
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
     *
     * @param directoryPath
     * @param filename
     * @returns html string
     */
    FileDialog.prototype.getFileIconHtml = function (directoryPath, filename) {
        return "\n        <div class=\"select_file_container\" id=\"" + directoryPath + filename + "_file\" onMouseDown=\"return false;\">\n            <img class=\"file_icon\" src=\"/image/icon_file.png\" />\n            <p>" + filename + "</p>\n        </div>";
    };
    ;
    /**
     *
     * @param directoryPath
     * @param dirname
     * @return html string
     */
    FileDialog.prototype.getDirectoryIconHtml = function (directoryPath, dirname) {
        return "\n        <div class=\"select_dir_container\" id=\"" + directoryPath + dirname + "_dir\" onMouseDown=\"return false;\">\n            <img class=\"dir_icon\" src=\"/image/icon_dir.png\" />\n            <p>" + dirname + "</p>\n        </div>";
    };
    ;
    /**
     *
     * @param fileTypes
     */
    FileDialog.prototype.createHtml4FileIcon = function (fileTypes) {
        var _this = this;
        var html = [];
        fileTypes.files
            .filter(function (file) { return file.type === 'file'; })
            .forEach(function (file) { return html.push(_this.getFileIconHtml(fileTypes.directory, file.name)); });
        return html.join('');
    };
    /**
     *
     * @param fileTypes
     */
    FileDialog.prototype.createHtml4DirIcon = function (fileTypes) {
        var _this = this;
        var html = [];
        fileTypes.files
            .filter(function (file) { return file.type === 'dir'; })
            .forEach(function (file) { return html.push(_this.getDirectoryIconHtml(fileTypes.directory, file.name)); });
        return html.join('');
    };
    /**
     *
     * @param callback
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
     *
     * @param callback
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
     *
     * @param callback
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
     *
     * @param callback
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
     *
     * @param callback
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
     *
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
            _this.fileDialog.empty();
            _this.fileDialog.html(directoryIconHtml + fileIconHtml);
            _this.addressBar.val(fileTypes.directory);
            _this.addressBar.borderValid();
            _this.lastSelectDirectory = fileTypes.directory;
            _this.currentDirectory = fileTypes.directory;
        });
    };
    /**
     *
     * @param eventObject
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
     *
     */
    FileDialog.prototype.clearSelectIcon = function () {
        $('.select_dir_container,.select_file_container').each(function (index, element) {
            $(element).css('border', 'solid 1px rgba(0, 0, 0, 0)');
        });
    };
    /**
     *
     * @param callback
     */
    FileDialog.prototype.onClickOK = function (callback) {
        if (!this.clickOkCallback) {
            this.clickOkCallback = callback;
        }
        return this;
    };
    /**
     *
     * @param callback
     */
    FileDialog.prototype.onClickCancel = function (callback) {
        if (!this.clickCancelCallback) {
            this.clickCancelCallback = callback;
        }
        return this;
    };
    /**
     *
     */
    FileDialog.prototype.show = function () {
        var _this = this;
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
        this.inputText.on('keyup', function (eventObject) {
            if (eventObject.which === 0x0D && _this.clickOkCallback) {
                _this.clickOkCallback(_this.inputText);
            }
        });
        return this;
    };
    /**
     *
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
        return this;
    };
    return FileDialog;
}());
//# sourceMappingURL=fileDialog.js.map