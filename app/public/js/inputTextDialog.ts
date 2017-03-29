/**
 * dialog base class
 */
interface DialogBase<T> {
    /**
     * gray panel element
     */
    grayPanel: JQuery;
    /**
     * dialog frame area element
     */
    dialogArea: JQuery;
    /**
     * input text element
     */
    inputText: JQuery;
    /**
     * ok button element
     */
    buttonOK: JQuery;
    /**
     * cancel button element
     */
    buttonCancel: JQuery;
    /**
     * show dialog function
     */
    show: (() => T);
    /**
     * hide dialog function
     */
    hide: (() => T);
    /**
     * callback function for click ok button
     */
    onClickOK: ((callback?: Function) => T);
    /**
     * callback function for click cancecl button
     */
    onClickCancel: ((callback?: Function) => T);
}

/**
 * text input dialog class
 */
class InputTextDialog implements DialogBase<InputTextDialog> {

    /**
     * gray panel element
     */
    public grayPanel: JQuery = $('#gray_panel');

    /**
     * dialog frame area element
     */
    public dialogArea: JQuery = $('#dialog_area_input');

    /**
     * input text element
     */
    public inputText: JQuery = $('#input_text_input');

    /**
     * ok button element
     */
    public buttonOK: JQuery = $('#dialog_ok_button_input');

    /**
     * cancel button element
     */
    public buttonCancel: JQuery = $('#dialog_cancel_button_input');

    /**
     * dialog title element
     */
    private title: JQuery = $('#dialog_title_input');

    /**
     * input text label element
     */
    private label: JQuery = $('#label_input');

    /**
     * default name
     */
    private defaultName: string;

    /**
     * event enable flag
     */
    private isEnableEvent: boolean = true;

    /**
     * callback function for click ok button
     */
    private clickOkCallback: ((inputTextElement: JQuery) => void);

    /**
     * callback function for click cancel button
     */
    private clickCancelCallback;

    /**
     * callback function for key up button at text box
     */
    private keyupEnterCallback;

    /**
     * key pressed flag
     */
    private keyPressedFlag = false;

    /**
     * create input text dialog instance
     * @param name dialog label name
     */
    public constructor(name?: string) {
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
    public show(title?: string, label?: string): InputTextDialog {
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
        this.inputText.on('keyup', (eventObject: JQueryEventObject) => {
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
    public hide(): InputTextDialog {
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
    public onClickOK(callback?: ((inputTextElement: JQuery) => void)): InputTextDialog {
        this.clickOkCallback = null;
        this.clickOkCallback = callback;
        return this;
    }

    /**
     * Adds a callback function for cancel button click event
     * @param callback
     * @return InputTextDialog instance
     */
    public onClickCancel(callback?: Function): InputTextDialog {
        this.clickCancelCallback = null;
        this.clickCancelCallback = callback;
        return this;
    }

    /**
     * set events enable
     * @return InputTextDialog instance
     */
    public enableEvent(): InputTextDialog {
        this.isEnableEvent = true;
        return this;
    }

    /**
     * set events disable
     * @return InputTextDialog instance
     */
    public disableEvent(): InputTextDialog {
        this.isEnableEvent = false;
        return this;
    }

    /**
     * set busy
     * @param name button name
     * @return InputTextDialog instance
     */
    public setBusy(name: string): InputTextDialog {
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
    public clearBusy(): InputTextDialog {
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