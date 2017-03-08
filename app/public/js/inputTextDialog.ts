interface DialogBase<T> {
    grayPanel: JQuery;
    dialogArea: JQuery;
    inputText: JQuery;
    buttonOK: JQuery;
    buttonCancel: JQuery;
    show: (() => T);
    hide: (() => T);
    onClickOK: ((callback?: Function) => T);
    onClickCancel: ((callback?: Function) => T);
}

class InputTextDialog implements DialogBase<InputTextDialog> {

    /**
     *
     */
    public grayPanel: JQuery = $('#gray_panel');

    /**
     *
     */
    public dialogArea: JQuery = $('#dialog_area_input');

    /**
     *
     */
    public inputText: JQuery = $('#input_text_input');

    /**
     *
     */
    public buttonOK: JQuery = $('#dialog_ok_button_input');

    /**
     *
     */
    public buttonCancel: JQuery = $('#dialog_cancel_button_input');

    /**
     *
     */
    private title: JQuery = $('#dialog_title_input');

    /**
     *
     */
    private label: JQuery = $('#label_input');

    /**
     *
     */
    private name: string;

    /**
     *
     */
    private clickOkCallback: ((inputTextElement: JQuery) => void);

    /**
     *
     */
    private clickCancelCallback;

    /**
     *
     */
    private keyupEnterCallback;

    /**
     *
     * @param name
     */
    public constructor(name: string) {
        this.grayPanel.click(() => this.hide());
        this.name = name;
    }

    public show(): InputTextDialog {
        this.grayPanel.displayBlock();
        this.dialogArea.displayBlock();
        this.buttonOK.on('click', () => {
            if (this.clickOkCallback) {
                this.clickOkCallback(this.inputText);
            }
        });
        this.buttonCancel.one('click', () => {
            if (this.clickCancelCallback) {
                this.clickCancelCallback();
            }
            this.hide();
        });
        this.inputText.on('keyup', (eventObject: JQueryEventObject) => {
            if (eventObject.which === 0x0D && this.clickOkCallback) {
                this.clickOkCallback(this.inputText);
            }
        });
        this.title.text(`Please enter ${this.name} name`);
        this.label.text(`${this.name} :`);
        this.inputText.borderValid();
        this.inputText.val('');
        this.inputText.focus();
        return this;
    }

    public hide(): InputTextDialog {
        this.grayPanel.displayNone();
        this.dialogArea.displayNone();
        this.buttonOK.off('click');
        this.buttonCancel.off('click');
        this.inputText.off('keyup')
        return this;
    }

    public onClickOK(callback?: ((inputTextElement: JQuery) => void)): InputTextDialog {
        if (!this.clickOkCallback) {
            this.clickOkCallback = callback;
        }
        return this;
    }

    public onClickCancel(callback?: Function): InputTextDialog {
        if (!this.clickCancelCallback) {
            this.clickCancelCallback = callback;
        }
        return this;
    }

    public onKeyUpEnter(callback?: Function): InputTextDialog {
        if (!this.keyupEnterCallback) {
            this.keyupEnterCallback = callback;
        }
        return this;
    }
}