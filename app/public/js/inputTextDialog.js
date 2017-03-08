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
        this.grayPanel.click(function () { return _this.hide(); });
        this.name = name;
    }
    InputTextDialog.prototype.show = function () {
        var _this = this;
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
        this.title.text("Please enter " + this.name + " name");
        this.label.text(this.name + " :");
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
        if (!this.clickOkCallback) {
            this.clickOkCallback = callback;
        }
        return this;
    };
    InputTextDialog.prototype.onClickCancel = function (callback) {
        if (!this.clickCancelCallback) {
            this.clickCancelCallback = callback;
        }
        return this;
    };
    InputTextDialog.prototype.onKeyUpEnter = function (callback) {
        if (!this.keyupEnterCallback) {
            this.keyupEnterCallback = callback;
        }
        return this;
    };
    return InputTextDialog;
}());
//# sourceMappingURL=inputTextDialog.js.map