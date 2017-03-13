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
    private isEnableEvent: boolean = true;

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
    public constructor(name?: string) {
        this.grayPanel.click(() => {
            if (this.isEnableEvent) {
                this.hide();
            }
        });
        this.name = name === undefined ? '' : name;
    }

    public show(title?: string, label?: string): InputTextDialog {
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
        this.inputText.on('keyup', (eventObject: JQueryEventObject) => {
            if (this.isEnableEvent && this.clickOkCallback && eventObject.which === 0x0D) {
                this.clickOkCallback(this.inputText);
            }
        });
        if (title == null) {
            title = `Please enter ${this.name} name`;
        }
        if (label == null) {
            label = `${this.name}:`;
        }
        this.offBusy();
        this.title.text(title);
        this.label.text(label);
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
        this.inputText.off('keyup');
        return this;
    }

    public onClickOK(callback?: ((inputTextElement: JQuery) => void)): InputTextDialog {
        this.clickOkCallback = null;
        this.clickOkCallback = callback;
        return this;
    }

    public onClickCancel(callback?: Function): InputTextDialog {
        this.clickCancelCallback = null;
        this.clickCancelCallback = callback;
        return this;
    }

    public enableEvent(): InputTextDialog {
        this.isEnableEvent = true;
        return this;
    }

    public disableEvent(): InputTextDialog {
        this.isEnableEvent = false;
        return this;
    }

    public onBusy(name: string) {
        this.disableEvent();
        this.inputText
            .prop('disabled', true);
        this.buttonOK
            .text(name)
            .prop('disabled', true)
            .class('testing_button button');
    }

    public offBusy() {
        this.enableEvent();
        this.inputText
            .prop('disabled', false);
        this.buttonOK
            .text('OK')
            .prop('disabled', false)
            .class('dialog_button button');
    }
}