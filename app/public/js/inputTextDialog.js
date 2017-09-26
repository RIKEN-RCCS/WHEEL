/**
 * text input dialog class
 */
class InputTextDialog {
    /**
     * create input text dialog instance
     * @param name dialog label name
     */
    constructor(name) {
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
        /**
         * key pressed flag
         */
        this.keyPressedFlag = false;
        this.grayPanel.click(() => {
            if (this.isEnableEvent) {
                this.hide();
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
    show(title, label) {
        this.keyPressedFlag = false;
        this.grayPanel.displayBlock();
        this.dialogArea.displayBlock();
        this.buttonOK.on('click', () => {
            if (this.isEnableEvent && this.clickOkCallback) {
                this.clickOkCallback(this.inputText);
            }
        });
        this.buttonCancel.one('click', () => {
            if (this.isEnableEvent) {
                if (this.clickCancelCallback) {
                    this.clickCancelCallback();
                }
                this.hide();
            }
        });
        this.inputText.on('keypress', () => {
            this.keyPressedFlag = true;
        });
        this.inputText.on('keyup', (eventObject) => {
            const ENTER_KEY = 0x0D;
            if (this.isEnableEvent && this.clickOkCallback && eventObject.which === ENTER_KEY) {
                this.clickOkCallback(this.inputText);
            }
        });
        if (title == null) {
            title = `Please enter ${this.defaultName} name`;
        }
        if (label == null) {
            label = `${this.defaultName}:`;
        }
        this.clearBusy();
        this.title.text(title);
        this.label.text(label);
        this.inputText.borderValid();
        this.inputText.val('');
        this.inputText.focus();
        return this;
    }
    /**
     * hide dialog
     * @return InputTextDialog instance
     */
    hide() {
        this.grayPanel.displayNone();
        this.dialogArea.displayNone();
        this.buttonOK.off('click');
        this.buttonCancel.off('click');
        this.inputText.off('keyup');
        this.inputText.off('keypress');
        return this;
    }
    /**
     * Adds a callback function for ok button click event
     * @param callback
     * @return InputTextDialog instance
     */
    onClickOK(callback) {
        this.clickOkCallback = null;
        this.clickOkCallback = callback;
        return this;
    }
    /**
     * Adds a callback function for cancel button click event
     * @param callback
     * @return InputTextDialog instance
     */
    onClickCancel(callback) {
        this.clickCancelCallback = null;
        this.clickCancelCallback = callback;
        return this;
    }
    /**
     * set events enable
     * @return InputTextDialog instance
     */
    enableEvent() {
        this.isEnableEvent = true;
        return this;
    }
    /**
     * set events disable
     * @return InputTextDialog instance
     */
    disableEvent() {
        this.isEnableEvent = false;
        return this;
    }
    /**
     * set busy
     * @param name button name
     * @return InputTextDialog instance
     */
    setBusy(name) {
        this.disableEvent();
        this.inputText
            .prop('disabled', true);
        this.buttonOK
            .text(name)
            .prop('disabled', true)
            .class('disable_button button');
        return this;
    }
    /**
     * clear busy
     * @return InputTextDialog instance
     */
    clearBusy() {
        this.enableEvent();
        this.inputText
            .prop('disabled', false);
        this.buttonOK
            .text('OK')
            .prop('disabled', false)
            .class('dialog_button button');
        return this;
    }
}
//# sourceMappingURL=inputTextDialog.js.map