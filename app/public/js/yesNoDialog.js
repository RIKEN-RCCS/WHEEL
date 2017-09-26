/**
 * yes no dialog class
 */
class YesNoDialog {
    /**
     * create new instance
     * @param text title text
     */
    constructor(text) {
        /**
         * gray panel element
         */
        this.grayPanel = $('#gray_panel');
        /**
         * dialog frame area element
         */
        this.dialogArea = $('#dialog_area_yesno');
        /**
         * input text element
         */
        this.inputText = $('#input_text_yesno');
        /**
         * ok button element
         */
        this.buttonOK = $('#dialog_ok_button_yesno');
        /**
         * cancel button element
         */
        this.buttonCancel = $('#dialog_cancel_button_yesno');
        /**
         * dialog title element
         */
        this.title = $('#dialog_title_yesno');
        this.text = text;
        this.grayPanel.click(() => this.hide());
    }
    /**
     * show dialog
     * @return YesNoDialog instance
     */
    show() {
        this.title.text(this.text);
        this.grayPanel.displayBlock();
        this.dialogArea.displayBlock();
        this.buttonOK.on('click', () => {
            if (this.clickOkCallback) {
                this.clickOkCallback();
            }
            this.hide();
        });
        this.buttonCancel.one('click', () => {
            if (this.clickCancelCallback) {
                this.clickCancelCallback();
            }
            this.hide();
        });
        return this;
    }
    /**
     *
     * hide dialog
     * @return YesNoDialog instance
     */
    hide() {
        this.grayPanel.displayNone();
        this.dialogArea.displayNone();
        this.buttonOK.off('click');
        this.buttonCancel.off('click');
        return this;
    }
    /**
     * set callback function for click ok button
     * @param callback The function to call when we click ok button
     * @return YesNoDialog instance
     */
    onClickOK(callback) {
        if (!this.clickOkCallback) {
            this.clickOkCallback = callback;
        }
        return this;
    }
    /**
     * set callback function for click cancel button
     * @param callback The function to call when we click cancel button
     * @return YesNoDialog instance
     */
    onClickCancel(callback) {
        if (!this.clickCancelCallback) {
            this.clickCancelCallback = callback;
        }
        return this;
    }
}
//# sourceMappingURL=yesNoDialog.js.map