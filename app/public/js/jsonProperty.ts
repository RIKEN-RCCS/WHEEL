class JsonProperty {
    /**
     *
     */
    private static counter: number = 0;

    /**
     *
     */
    private child: SwfTree;

    /**
     *
     */
    private hostInfos: SwfHostJson[];

    /**
     *
     */
    private property = $('#property');

    /**
     *
     */
    private events: { [event: string]: string } = {};

    /**
     *
     */
    private clearEvents() {
        Object.keys(this.events).forEach(key => {
            $(document).off(this.events[key], key);
            delete this.events[key];
        });
    }

    /**
     *
     * @param object
     * @param key
     * @param id
     */
    private createNumberChangedEvent(object: any, key: string, id: string, prop: PropertyInfo) {
        $(document).on('change', `#${id}`, (eventObject: JQueryEventObject) => {
            const element = $(eventObject.target);
            const v: string = element.val().trim();
            if (v.match(/^\-?\d+$/)) {
                if (prop.validation === undefined || (prop.validation && prop.validation(this.child, v))) {
                    object[key] = parseInt(v);
                    element.borderValid();
                    return;
                }
            }
            element.borderInvalid();
        });
        this.events[`#${id}`] = 'change';
    }

    /**
     *
     * @param object
     * @param key
     * @param id
     * @param prop
     */
    private createTextChangedEvent(object: any, key: string, id: string, prop: PropertyInfo) {
        $(document).on('keyup', `#${id}`, (eventObject: JQueryEventObject) => {
            const element = $(eventObject.target)
            const newData = element.val();
            const oldData = object[key];

            if (oldData === newData) {
                element.borderValid();
                return;
            }

            if (prop.validation === undefined || (prop.validation && prop.validation(this.child, newData, oldData))) {
                if (prop.callback) {
                    prop.callback(this.child, object, newData);
                }
                object[key] = newData;

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
     *
     * @param object
     * @param key
     * @param id
     */
    private createBooleanChangedEvent(object: any, key: string, id: string, prop: PropertyInfo) {
        $(document).on('change', `#${id}`, (eventObject: JQueryEventObject) => {
            const element = $(eventObject.target)
            const newData = element.val();
            const oldData = object[key];

            if (oldData === newData) {
                return;
            }

            if (prop.callback) {
                prop.callback(this.child, object, newData);
            }
            object[key] = newData === 'true';
        });
        this.events[`#${id}`] = 'change';
    }

    /**
     *
     * @param object
     * @param key
     * @param id
     */
    private createTypeChangedEvent(object: any, key: string, id: string, prop: PropertyInfo) {
        $(document).on('change', `#${id}`, (eventObject: JQueryEventObject) => {
            const newData = $(eventObject.target).val();
            const oldData = object[key];
            if (oldData === newData) {
                return;
            }
            object[key] = newData;
            $(document).trigger('updateDisplay');
        });
        this.events[`#${id}`] = 'change';
    }

    /**
     *
     * @param host
     * @param key
     * @param id
     * @param prop
     */
    private createHostChangedEvent(host: SwfHostJson, id: string) {
        $(document).on('change', `#${id}`, (eventObject: JQueryEventObject) => {
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
        this.events[`#${id}`] = 'change';
    }

    /**
     *
     * @param host
     * @param key
     * @param id
     * @param prop
     */
    private createSchedulerChangedEvent(host: SwfHostJson, id: string) {
        $(document).on('change', `#${id}`, (eventObject: JQueryEventObject) => {
            const newData = $(eventObject.target).val();
            const oldData = host.job_scheduler;
            if (oldData === newData) {
                return;
            }
            host.job_scheduler = newData;
        });
        this.events[`#${id}`] = 'change';
    }

    /**
     *
     * @param object
     * @param prop
     */
    private getContents(object: any, prop: PropertyInfo) {
        let content: string = '';
        const id = `property_${JsonProperty.counter++}`;
        const key = prop.key;

        if (prop.readonly && prop.readonly(this.child, object)) {
            content = `<input type="text" value="${object[key]}" class="text_box text_readonly property_text" disabled>`;
        }
        else {
            switch (prop.type) {
                case 'string':
                    content = `<input type="text" value="${object[key]}" class="text_box property_text" id="${id}">`;
                    this.createTextChangedEvent(object, key, id, prop);
                    break;
                case 'number':
                    content = `<input type="number" value="${object[key]}" class="text_box property_text" id="${id}" min="0">`;
                    this.createNumberChangedEvent(object, key, id, prop);
                    break;
                case 'boolean':
                    const selectedTrue = object[key] ? 'selected' : '';
                    const selectedFalse = !object[key] ? 'selected' : '';
                    content = `
                    <select name="${id}" class="text_box" style="width: calc(100% - 4px)" id="${id}">
                        <option value="true" ${selectedTrue}>TRUE</option>
                        <option value="false" ${selectedFalse}>FALSE</option>
                    </select>`;
                    this.createBooleanChangedEvent(object, key, id, prop);
                    break;
                case 'host':
                    const hosts: string[] = this.hostInfos.map(host => {
                        const isSelected = host.name === object.name ? 'selected' : '';
                        return `<option value="${host.name}" ${isSelected}>${host.name}</option>`
                    });
                    content = `<select name="${id}" class="text_box" style="width: calc(100% - 4px)" id="${id}">${hosts.join('')}</select>`;
                    this.createHostChangedEvent(object, id);
                    break;
                case 'scheduler':
                    const schedulers: string[] = Object.keys(config.scheduler).map(key => {
                        const value = config.scheduler[key];
                        const isSelected = value === object.job_scheduler ? 'selected' : '';
                        return `<option value="${value}" ${isSelected}>${value}</option>`;
                    });
                    content = `<select name="${id}" class="text_box" style="width: calc(100% - 4px)" id="${id}">${schedulers.join('')}</select>`;
                    this.createSchedulerChangedEvent(object, id);
                    break;
                default:
                    break;
            }
        }

        return `
            <tr>
                <td style="width:150px; padding-left: 10px">${this.createItemName(key)}</td>
                <td style="height: 29px">${content}</td>
            <tr>`;
    }

    /**
     * update property infomation
     */
    private updateDisplay() {
        this.property.empty();
        this.property.html(this.createPropertyHtml(this.child));
    }

    /**
     *
     * @param object
     * @param key
     * @param prop
     */
    private setupButtonEvent(object: any, key: string, props: PropertyInfo[]) {
        const html: string[] = [];
        let title: string;
        props.forEach(prop => {
            const id = `button_property_${JsonProperty.counter++}`;
            if (!prop.validation || prop.validation(this.child)) {
                $(document).on('click', `#${id}`, (eventObject) => {
                    const element = $(eventObject.target);
                    if (prop.callback) {
                        prop.callback(this.child, object);
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
     * create property item name
     * @param key
     */
    private createItemName(key: string): string {
        return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLocaleLowerCase();
    }

    /**
     * create property html
     * @param tree
     */
    private createPropertyHtml(tree: any): string {
        this.clearEvents();
        JsonProperty.counter = 0;
        this.child = tree;
        const html: string[] = ['<div>property</div>'];
        const parentHtml: string[] = [];
        const property = ClientUtility.getPropertyInfo(tree);

        const createTableHtml = (data: string[]): string => {
            const html = `<table>${data.join('')}</table>`;
            data.length = 0;
            return html;
        };

        const createSubTitle = (object: any, prop: any) => {
            if (prop.button) {
                return this.setupButtonEvent(object, prop.key, prop.button);
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

                tree[key].forEach((value, index) => {
                    prop.item.forEach(item => {
                        html.push(this.getContents(value, item));
                    });

                    parentHtml.push(createSubTitle(tree[key][index], prop));
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
                        html.push(this.getContents(tree[key], item));
                    });

                    parentHtml.push(createSubTitle(tree[key], prop));
                    parentHtml.push(createTableHtml(html));
                }
                else {
                    parentHtml.push(createSubTitle(tree[key], prop));
                }
            }
            else {
                if (prop.title) {
                    html.push(createSubTitle(tree[key], prop));
                }
                else if (!html[0]) {
                    html.push('<hr>');
                }
                html.push(this.getContents(tree, prop));
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
     *
     * show property
     * @param tree
     * @param hostInfos
     */
    public show(tree: SwfTree, hostInfos: SwfHostJson[]) {
        this.hostInfos = hostInfos;
        this.property.html(this.createPropertyHtml(tree));
        if (this.property.css('display') === 'none') {
            this.property.displayBlock();
            this.property.animate({ width: '350px', 'min-width': '350px' }, 100);
        }
    }
}