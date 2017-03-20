/**
 * text input dialog class
 */
var InputTextDialog = (function () {
    /**
     * create input text dialog instance
     * @param name dialog label name
     */
    function InputTextDialog(name) {
        var _this = this;
        /**
         * gray panel element
         */
        this.grayPanel = $('#gray_panel');
        /**
         * dialog frame area element
         */
        this.dialogArea = $('#dialog_area_input');
        /**
         * input text element
         */
        this.inputText = $('#input_text_input');
        /**
         * ok button element
         */
        this.buttonOK = $('#dialog_ok_button_input');
        /**
         * cancel button element
         */
        this.buttonCancel = $('#dialog_cancel_button_input');
        /**
         * dialog title element
         */
        this.title = $('#dialog_title_input');
        /**
         * input text label element
         */
        this.label = $('#label_input');
        /**
         * event enable flag
         */
        this.isEnableEvent = true;
        this.grayPanel.click(function () {
            if (_this.isEnableEvent) {
                _this.hide();
            }
        });
        this.defaultName = name === undefined ? '' : name;
    }
    /**
     * show dialog
     * @param title dialog title string
     * @param label dialog label string
     * @return InputTextDialog instance
     */
    InputTextDialog.prototype.show = function (title, label) {
        var _this = this;
        this.grayPanel.displayBlock();
        this.dialogArea.displayBlock();
        this.buttonOK.on('click', function () {
            if (_this.isEnableEvent && _this.clickOkCallback) {
                _this.clickOkCallback(_this.inputText);
            }
        });
        this.buttonCancel.one('click', function () {
            if (_this.isEnableEvent) {
                if (_this.clickCancelCallback) {
                    _this.clickCancelCallback();
                }
                _this.hide();
            }
        });
        this.inputText.on('keyup', function (eventObject) {
            if (_this.isEnableEvent && _this.clickOkCallback && eventObject.which === 0x0D) {
                _this.clickOkCallback(_this.inputText);
            }
        });
        if (title == null) {
            title = "Please enter " + this.defaultName + " name";
        }
        if (label == null) {
            label = this.defaultName + ":";
        }
        this.clearBusy();
        this.title.text(title);
        this.label.text(label);
        this.inputText.borderValid();
        this.inputText.val('');
        this.inputText.focus();
        return this;
    };
    /**
     * hide dialog
     * @return InputTextDialog instance
     */
    InputTextDialog.prototype.hide = function () {
        this.grayPanel.displayNone();
        this.dialogArea.displayNone();
        this.buttonOK.off('click');
        this.buttonCancel.off('click');
        this.inputText.off('keyup');
        return this;
    };
    /**
     * Adds a callback function for ok button click event
     * @param callback
     * @return InputTextDialog instance
     */
    InputTextDialog.prototype.onClickOK = function (callback) {
        this.clickOkCallback = null;
        this.clickOkCallback = callback;
        return this;
    };
    /**
     * Adds a callback function for cancel button click event
     * @param callback
     * @return InputTextDialog instance
     */
    InputTextDialog.prototype.onClickCancel = function (callback) {
        this.clickCancelCallback = null;
        this.clickCancelCallback = callback;
        return this;
    };
    /**
     * set events enable
     * @return InputTextDialog instance
     */
    InputTextDialog.prototype.enableEvent = function () {
        this.isEnableEvent = true;
        return this;
    };
    /**
     * set events disable
     * @return InputTextDialog instance
     */
    InputTextDialog.prototype.disableEvent = function () {
        this.isEnableEvent = false;
        return this;
    };
    /**
     * set busy
     * @param name button name
     * @return InputTextDialog instance
     */
    InputTextDialog.prototype.setBusy = function (name) {
        this.disableEvent();
        this.inputText
            .prop('disabled', true);
        this.buttonOK
            .text(name)
            .prop('disabled', true)
            .class('disable_button button');
        return this;
    };
    /**
     * clear busy
     * @return InputTextDialog instance
     */
    InputTextDialog.prototype.clearBusy = function () {
        this.enableEvent();
        this.inputText
            .prop('disabled', false);
        this.buttonOK
            .text('OK')
            .prop('disabled', false)
            .class('dialog_button button');
        return this;
    };
    return InputTextDialog;
}());
//# sourceMappingURL=inputTextDialog.js.map