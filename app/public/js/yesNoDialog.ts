/**
 * yes no dialog class
 */
class YesNoDialog implements DialogBase<YesNoDialog> {

    /**
     * gray panel element
     */
    public grayPanel: JQuery = $('#gray_panel');

    /**
     * dialog frame area element
     */
    public dialogArea: JQuery = $('#dialog_area_yesno');

    /**
     * input text element
     */
    public inputText: JQuery = $('#input_text_yesno');

    /**
     * ok button element
     */
    public buttonOK: JQuery = $('#dialog_ok_button_yesno');

    /**
     * cancel button element
     */
    public buttonCancel: JQuery = $('#dialog_cancel_button_yesno');

    /**
     * dialog title element
     */
    private title: JQuery = $('#dialog_title_yesno');

    /**
     * title text
     */
    private text: string;

    /**
     * callback function for click ok button
     */
    private clickOkCallback;

    /**
     * callback function for click cancel button
     */
    private clickCancelCallback;

    /**
     * create new instance
     * @param text title text
     */
    public constructor(text: string) {
        this.text = text;
        this.grayPanel.click(() => this.hide());
    }

    /**
     * show dialog
     * @return YesNoDialog instance
     */
    public show(): YesNoDialog {
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
    public hide(): YesNoDialog {
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
    public onClickOK(callback?: Function): YesNoDialog {
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
    public onClickCancel(callback?: Function): YesNoDialog {
        if (!this.clickCancelCallback) {
            this.clickCancelCallback = callback;
        }
        return this;
    }
}