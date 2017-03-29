/**
 * json property class for display
 */
class JsonProperty {
    /**
     * unique counter for html element id
     */
    private static counter: number = 0;

    /**
     * selected tree instance
     */
    private tree: SwfTree;

    /**
     * registerd host information
     */
    private hostInfos: SwfHostJson[];

    /**
     * display element
     */
    private property = $('#property');

    /**
     * setting events
     */
    private events: { [event: string]: string } = {};

    /**
     * create new instance
     */
    public constructor() {
        $(window).on('resize', () => {
            this.resize();
        });
    }

    /**
     * resize property
     */
    private resize() {
        const parent = this.property.parent();
        this.property.css('top', `${parent.offset().top}px`);
    }

    /**
     * clear all events
     */
    private clearEvents() {
        Object.keys(this.events).forEach(key => {
            $(document).off(this.events[key], key);
            delete this.events[key];
        });
    }

    /**
     * set text changed event for number property
     * @param object property information of SwfTree instance
     * @param id id for html
     * @param prop property config
     */
    private setChangeEventForNumber(object: any, id: string, prop: PropertyInfo) {
        id = `#${id}`
        this.events[id] = 'change';
        $(document).on(this.events[id], id, (eventObject: JQueryEventObject) => {
            const element = $(eventObject.target);
            const v: string = element.val().trim();
            if (v.match(/^\-?\d+$/)) {
                if (prop.validation === undefined || (prop.validation && prop.validation(this.tree, v))) {
                    object[prop.key] = parseInt(v);
                    element.borderValid();
                    return;
                }
            }
            element.borderInvalid();
        });
    }

    /**
     * set keyup event for string property
     * @param object property information of SwfTree instance
     * @param id id for html
     * @param prop property config
     */
    private setKeyupEventForString(object: any, id: string, prop: PropertyInfo) {
        id = `#${id}`
        this.events[id] = 'keyup';
        $(document).on(this.events[id], id, (eventObject: JQueryEventObject) => {
            const element = $(eventObject.target)
            const newData = element.val();
            const oldData = object[prop.key];

            if (oldData === newData) {
                element.borderValid();
                return;
            }

            if (prop.validation === undefined || (prop.validation && prop.validation(this.tree, newData, oldData))) {
                if (prop.callback) {
                    prop.callback(this.tree, object, newData);
                }
                object[prop.key] = newData;

                if (prop.isUpdateUI) {
                    $(document).trigger('updateDisplay');
                }
                element.borderValid();
            }
            else {
                element.borderInvalid();
            }
        });
        this.events[`#${id}`] = 'keyup';
    }

    /**
     * set select box change event for boolean property
     * @param object property information of SwfTree instance
     * @param id id for html
     * @param prop property config
     */
    private setChangeEventForBoolean(object: any, id: string, prop: PropertyInfo) {
        id = `#${id}`
        this.events[id] = 'change';
        $(document).on(this.events[id], id, (eventObject: JQueryEventObject) => {
            const element = $(eventObject.target)
            const newData = element.val();
            const oldData = object[prop.key];

            if (oldData === newData) {
                return;
            }

            if (prop.callback) {
                prop.callback(this.tree, object, newData);
            }
            object[prop.key] = newData === 'true';
        });
    }

    /**
     * set select box change event for host property
     * @param host registered host information
     * @param id id for html
     */
    private setChangeEventForHost(host: SwfHostJson, id: string) {
        id = `#${id}`
        this.events[id] = 'change';
        $(document).on(this.events[id], id, (eventObject: JQueryEventObject) => {
            const newData = $(eventObject.target).val();
            const oldData = host.name;
            if (oldData === newData) {
                return;
            }
            const newHost = this.hostInfos.filter(host => host.name === newData)[0];
            host.name = newHost.name;
            host.description = newHost.description;
            host.path = newHost.path;
            host.host = newHost.host;
            host.username = newHost.username;
            host.privateKey = newHost.privateKey;
        });
    }

    /**
     * set select box change event for scheduler property
     * @param host registered host information
     * @param id id for html
     */
    private setChangeEventForScheduler(host: SwfHostJson, id: string) {
        id = `#${id}`
        this.events[id] = 'change';
        $(document).on(this.events[id], id, (eventObject: JQueryEventObject) => {
            const newData = $(eventObject.target).val();
            const oldData = host.job_scheduler;
            if (oldData === newData) {
                return;
            }
            host.job_scheduler = newData;
        });
    }

    /**
     *
     * @param object
     * @param key
     * @param prop
     */
    private createButtonEvent(object: any, props: PropertyInfo[]) {
        const html: string[] = [];
        let title: string;
        props.forEach(prop => {
            const id = `button_property_${JsonProperty.counter++}`;
            if (!prop.validation || prop.validation(this.tree)) {
                $(document).on('click', `#${id}`, (eventObject) => {
                    const element = $(eventObject.target);
                    if (prop.callback) {
                        prop.callback(this.tree, object);
                    }
                    if (prop.isUpdateUI) {
                        this.updateDisplay();
                        $(document).trigger('updateDisplay');
                    }
                });
                this.events[`#${id}`] = 'click';
            }
            else {
                this.property.ready(() => {
                    $(`#${id}`).prop('disabled', true).class('disable_button button');
                });
                this.events['#property'] = 'ready';
            }
            if (title === undefined) {
                title = this.createItemName(prop.title);
            }

            html.push(`<input type="button" value="${prop.key}" class="button" id="${id}">`);
        });

        return `<hr><div>${title}<div>${html.join('')}</div></div>`;
    }

    /**
     * create html content
     * @param object property information of SwfTree instance
     * @param prop property config
     */
    private createHtmlContent(object: any, prop: PropertyInfo) {
        let content: string = '';
        const id = `property_${JsonProperty.counter++}`;

        if (prop.readonly && prop.readonly(this.tree, object)) {
            content = `<input type="text" value="${object[prop.key]}" class="text_box text_readonly property_text" disabled>`;
        }
        else {
            switch (prop.type) {
                case 'string':
                    content = `<input type="text" value="${object[prop.key]}" class="text_box property_text" id="${id}" spellcheck="false">`;
                    this.setKeyupEventForString(object, id, prop);
                    break;
                case 'number':
                    content = `<input type="number" value="${object[prop.key]}" class="text_box property_text" id="${id}" min="0">`;
                    this.setChangeEventForNumber(object, id, prop);
                    break;
                case 'boolean':
                    const selectedTrue = object[prop.key] ? 'selected="selected"' : '';
                    const selectedFalse = !object[prop.key] ? 'selected="selected"' : '';
                    content = `
                    <select name="${id}" class="text_box" style="width: calc(100% - 4px)" id="${id}">
                        <option value="true" ${selectedTrue}>TRUE</option>
                        <option value="false" ${selectedFalse}>FALSE</option>
                    </select>`;
                    this.setChangeEventForBoolean(object, id, prop);
                    break;
                case 'host':
                    const hosts: string[] = this.hostInfos.map(host => {
                        const isSelected = host.name === object.name ? 'selected="selected"' : '';
                        return `<option value="${host.name}" ${isSelected}>${host.name}</option>`
                    });
                    content = `<select name="${id}" class="text_box" style="width: calc(100% - 4px)" id="${id}">${hosts.join('')}</select>`;
                    this.setChangeEventForHost(object, id);
                    break;
                case 'scheduler':
                    const schedulers: string[] = Object.keys(config.scheduler).map(key => {
                        const value = config.scheduler[key];
                        const isSelected = value === object.job_scheduler ? 'selected="selected"' : '';
                        return `<option value="${value}" ${isSelected}>${value}</option>`;
                    });
                    content = `<select name="${id}" class="text_box" style="width: calc(100% - 4px)" id="${id}">${schedulers.join('')}</select>`;
                    this.setChangeEventForScheduler(object, id);
                    break;
                default:
                    break;
            }
        }

        return `
            <tr>
                <td style="width:150px; padding-left: 10px">${this.createItemName(prop.key)}</td>
                <td style="height: 29px">${content}</td>
            <tr>`;
    }

    /**
     * update property infomation
     */
    private updateDisplay() {
        this.property.empty();
        this.property.html(this.createPropertyHtml());
    }

    /**
     * create property item name
     * @param key property key name
     * @return create property item name
     */
    private createItemName(key: string): string {
        return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLocaleLowerCase();
    }

    /**
     * create property html
     * @return html string
     */
    private createPropertyHtml(): string {
        this.clearEvents();
        JsonProperty.counter = 0;
        const html: string[] = ['<div>property</div>'];
        const parentHtml: string[] = [];
        const property = ClientUtility.getPropertyInfo(this.tree);

        const createTableHtml = (data: string[]): string => {
            const html = `<table>${data.join('')}</table>`;
            data.length = 0;
            return html;
        };

        const createSubTitle = (object: any, prop: any) => {
            if (prop.button) {
                return this.createButtonEvent(object, prop.button);
            }
            else if (prop.title) {
                return `<hr><div>${prop.title}</div>`;
            }
            else {
                return `<hr><div>${this.createItemName(prop.key)}</div>`;
            }
        }

        property.forEach(prop => {
            const key = prop.key;
            if (prop.isarray) {
                if (html[0]) {
                    parentHtml.push(createTableHtml(html));
                }

                this.tree[key].forEach((value, index) => {
                    prop.item.forEach(item => {
                        html.push(this.createHtmlContent(value, item));
                    });

                    parentHtml.push(createSubTitle(this.tree[key][index], prop));
                    parentHtml.push(createTableHtml(html));
                });
                html.length = 0;
            }
            else if (prop.ishash) {
                if (html[0]) {
                    parentHtml.push(createTableHtml(html));
                }

                if (prop.item) {
                    prop.item.forEach(item => {
                        html.push(this.createHtmlContent(this.tree[key], item));
                    });

                    parentHtml.push(createSubTitle(this.tree[key], prop));
                    parentHtml.push(createTableHtml(html));
                }
                else {
                    parentHtml.push(createSubTitle(this.tree[key], prop));
                }
            }
            else {
                if (prop.title) {
                    html.push(createSubTitle(this.tree[key], prop));
                }
                else if (!html[0]) {
                    html.push('<hr>');
                }
                html.push(this.createHtmlContent(this.tree, prop));
            }
        });

        if (html.length) {
            parentHtml.push(createTableHtml(html));
        }

        parentHtml.push('<hr>')
        return parentHtml.join('');
    }

    /**
     * hide property
     */
    public hide() {
        this.property.animate({ width: '0px', 'min-width': '0px' }, 100, () => {
            this.property.displayNone();
            this.property.html('');
        });
    }

    /**
     * show property
     * @param tree display target SwfTree instance
     * @param hostInfos registerd host informations
     */
    public show(tree: SwfTree, hostInfos: SwfHostJson[]) {
        this.tree = tree;
        this.hostInfos = hostInfos;
        this.property.html(this.createPropertyHtml());
        if (this.property.css('display') === 'none') {
            this.resize();
            this.property.displayBlock();
            this.property.animate({ width: '350px', 'min-width': '350px' }, 100);
        }
    }
}