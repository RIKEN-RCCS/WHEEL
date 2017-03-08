class YesNoDialog implements DialogBase<YesNoDialog> {

    /**
     *
     */
    public grayPanel: JQuery = $('#gray_panel');

    /**
     *
     */
    public dialogArea: JQuery = $('#dialog_area_yesno');

    /**
     *
     */
    public inputText: JQuery = $('#input_text_yesno');

    /**
     *
     */
    public buttonOK: JQuery = $('#dialog_ok_button_yesno');

    /**
     *
     */
    public buttonCancel: JQuery = $('#dialog_cancel_button_yesno');

    /**
     *
     */
    private title: JQuery = $('#dialog_title_yesno');

    /**
     *
     */
    private text: string;

    /**
     *
     */
    private clickOkCallback;

    /**
     *
     */
    private clickCancelCallback;

    /**
     *
     * @param text
     * @param dialogAreaName
     */
    public constructor(text: string) {
        this.text = text;
        this.grayPanel.click(() => this.hide());
    }

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

    public hide(): YesNoDialog {
        this.grayPanel.displayNone();
        this.dialogArea.displayNone();
        this.buttonOK.off('click');
        this.buttonCancel.off('click');
        return this;
    }

    public onClickOK(callback?: Function): YesNoDialog {
        if (!this.clickOkCallback) {
            this.clickOkCallback = callback;
        }
        return this;
    }

    public onClickCancel(callback?: Function): YesNoDialog {
        if (!this.clickCancelCallback) {
            this.clickCancelCallback = callback;
        }
        return this;
    }
}