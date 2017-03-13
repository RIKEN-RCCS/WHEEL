var InputTextDialog = (function () {
    /**
     *
     * @param name
     */
    function InputTextDialog(name) {
        var _this = this;
        /**
         *
         */
        this.grayPanel = $('#gray_panel');
        /**
         *
         */
        this.dialogArea = $('#dialog_area_input');
        /**
         *
         */
        this.inputText = $('#input_text_input');
        /**
         *
         */
        this.buttonOK = $('#dialog_ok_button_input');
        /**
         *
         */
        this.buttonCancel = $('#dialog_cancel_button_input');
        /**
         *
         */
        this.title = $('#dialog_title_input');
        /**
         *
         */
        this.label = $('#label_input');
        /**
         *
         */
        this.isEnableEvent = true;
        this.grayPanel.click(function () {
            if (_this.isEnableEvent) {
                _this.hide();
            }
        });
        this.name = name === undefined ? '' : name;
    }
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
            title = "Please enter " + this.name + " name";
        }
        if (label == null) {
            label = this.name + ":";
        }
        this.offBusy();
        this.title.text(title);
        this.label.text(label);
        this.inputText.borderValid();
        this.inputText.val('');
        this.inputText.focus();
        return this;
    };
    InputTextDialog.prototype.hide = function () {
        this.grayPanel.displayNone();
        this.dialogArea.displayNone();
        this.buttonOK.off('click');
        this.buttonCancel.off('click');
        this.inputText.off('keyup');
        return this;
    };
    InputTextDialog.prototype.onClickOK = function (callback) {
        this.clickOkCallback = null;
        this.clickOkCallback = callback;
        return this;
    };
    InputTextDialog.prototype.onClickCancel = function (callback) {
        this.clickCancelCallback = null;
        this.clickCancelCallback = callback;
        return this;
    };
    InputTextDialog.prototype.enableEvent = function () {
        this.isEnableEvent = true;
        return this;
    };
    InputTextDialog.prototype.disableEvent = function () {
        this.isEnableEvent = false;
        return this;
    };
    InputTextDialog.prototype.onBusy = function (name) {
        this.disableEvent();
        this.inputText
            .prop('disabled', true);
        this.buttonOK
            .text(name)
            .prop('disabled', true)
            .class('testing_button button');
    };
    InputTextDialog.prototype.offBusy = function () {
        this.enableEvent();
        this.inputText
            .prop('disabled', false);
        this.buttonOK
            .text('OK')
            .prop('disabled', false)
            .class('dialog_button button');
    };
    return InputTextDialog;
}());
//# sourceMappingURL=inputTextDialog.js.map