var YesNoDialog = (function () {
    /**
     *
     * @param text
     * @param dialogAreaName
     */
    function YesNoDialog(text) {
        var _this = this;
        /**
         *
         */
        this.grayPanel = $('#gray_panel');
        /**
         *
         */
        this.dialogArea = $('#dialog_area_yesno');
        /**
         *
         */
        this.inputText = $('#input_text_yesno');
        /**
         *
         */
        this.buttonOK = $('#dialog_ok_button_yesno');
        /**
         *
         */
        this.buttonCancel = $('#dialog_cancel_button_yesno');
        /**
         *
         */
        this.title = $('#dialog_title_yesno');
        this.text = text;
        this.grayPanel.click(function () { return _this.hide(); });
    }
    YesNoDialog.prototype.show = function () {
        var _this = this;
        this.title.text(this.text);
        this.grayPanel.displayBlock();
        this.dialogArea.displayBlock();
        this.buttonOK.on('click', function () {
            if (_this.clickOkCallback) {
                _this.clickOkCallback();
            }
            _this.hide();
        });
        this.buttonCancel.one('click', function () {
            if (_this.clickCancelCallback) {
                _this.clickCancelCallback();
            }
            _this.hide();
        });
        return this;
    };
    YesNoDialog.prototype.hide = function () {
        this.grayPanel.displayNone();
        this.dialogArea.displayNone();
        this.buttonOK.off('click');
        this.buttonCancel.off('click');
        return this;
    };
    YesNoDialog.prototype.onClickOK = function (callback) {
        if (!this.clickOkCallback) {
            this.clickOkCallback = callback;
        }
        return this;
    };
    YesNoDialog.prototype.onClickCancel = function (callback) {
        if (!this.clickCancelCallback) {
            this.clickCancelCallback = callback;
        }
        return this;
    };
    return YesNoDialog;
}());
//# sourceMappingURL=yesNoDialog.js.map