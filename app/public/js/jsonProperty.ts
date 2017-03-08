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
                    $(document).trigger('updateProperty');
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
            $(document).trigger('updateProperty');
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
    private createHostChangedEvent(object: any, key: string, id: string, prop: PropertyInfo) {
        $(document).on('change', `#${id}`, (eventObject: JQueryEventObject) => {
            const newData = $(eventObject.target).val();
            const oldData = object[key];
            if (oldData === newData) {
                return;
            }
            const newHost = this.hostInfos.filter(host => host.name === newData)[0];
            Object.keys(newHost).forEach(key => {
                object[key] = newHost[key];
            });
        });
        this.events[`#${id}`] = 'change';
    }

    /**
     *
     * @param object
     * @param key
     * @param prop
     */
    private getContents(object: any, key: string, prop: PropertyInfo) {
        let content: string = '';
        const id = `property_${JsonProperty.counter++}`;

        if (prop.readonly) {
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
                        return `<option value="${host.name}" ${isSelected}>${host.username}@${host.host}</option>`
                    });
                    content = `
                    <select name="${id}" class="text_box" style="width: calc(100% - 4px)" id="${id}">
                        ${hosts.join('')}
                    </select>`;
                    this.createHostChangedEvent(object, key, id, prop);
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
     * set up click event for file delete button
     * @param tree
     * @param key
     * @param index
     */
    private setupFileDeleteButtonEvent(tree: SwfTree, key: string, index: number): string {
        const id = `delete_property_${JsonProperty.counter++}`;
        $(document).on('click', `#${id}`, () => {
            this.deleteFile(tree, key, index);
            this.updateProperty();
            $(document).trigger('updateProperty');
        });
        this.events[`#${id}`] = 'click';
        return this.createDeleteButtonHtml(key, id);
    }

    /**
     * set up click event for file add button
     * @param tree
     * @param key
     */
    private setupFileAddButtonEvent(tree: SwfTree, key: string): string {
        const id = `add_property_${JsonProperty.counter++}`;
        $(document).on('click', `#${id}`, () => {
            this.addFile(tree, key);
            this.updateProperty();
            $(document).trigger('updateProperty');
        });
        this.events[`#${id}`] = 'click';
        return this.createAddButtonHtml(key, id);
    }

    /**
     * update property infomation
     */
    private updateProperty() {
        this.property.html(this.createPropertyHtml(this.child));
    }

    /**
     * create delete button html
     * @param key
     * @param id
     */
    private createDeleteButtonHtml(key: string, id: string): string {
        return `
            <hr>
            <div>${this.createItemName(key).replace(/s$/, '')}
                <div><input type="button" value="Delete" class="button" style="width:50px;" id=${id}></div>
            </div>`;
    }

    /**
     * create add button html
     * @param key
     * @param id
     */
    private createAddButtonHtml(key: string, id: string): string {
        return `
            <hr>
            <div>${this.createItemName(key)}
                <div><input type="button" value="Add" class="button" style="width:50px;" id=${id}></div>
            </div>`;
    }

    /**
     * add IO file relation
     * @param tree
     * @param key
     */
    private addFile(tree: SwfTree, key: string) {
        const file = new SwfFile({
            name: 'name',
            description: '',
            path: `./file${Date.now()}`,
            type: 'file',
            required: true
        });

        tree[key].push(file);
        const parent = this.child.getParent();

        if (key === 'input_files') {
            parent.addInputFileToParent(this.child, file.path);
        }
        else if (key === 'output_files') {
            parent.addOutputFileToParent(this.child, file.path);
        }
    }

    /**
     * delete IO file relation
     * @param tree
     * @param key
     * @param index
     */
    private deleteFile(tree: SwfTree, key: string, index: number) {
        const filepath = tree[key][index].path;
        const parent = this.child.getParent();
        if (key === 'input_files') {
            parent.deleteInputFileFromParent(this.child, filepath);
        }
        else if (key === 'output_files') {
            parent.deleteOutputFileFromParent(this.child, filepath);
        }
        tree[key].splice(index, 1);
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
        const html: string[] = ['<div>propety</div>'];
        const parentHtml: string[] = [];
        const prop = ClientUtility.getPropertyInfo(tree);

        const createTableHtml = (data: string[]): string => {
            const html = `<table>${data.join('')}</table>`;
            data.length = 0;
            return html;
        };

        Object.keys(prop).forEach(key => {
            if (Array.isArray(prop[key])) {
                if (html[0]) {
                    parentHtml.push(createTableHtml(html));
                }

                parentHtml.push(this.setupFileAddButtonEvent(tree, key));
                tree[key].forEach((value, index) => {
                    Object.keys(prop[key][0]).forEach(secondKey => {
                        html.push(this.getContents(value, secondKey, prop[key][0][secondKey]));
                    });
                    parentHtml.push(this.setupFileDeleteButtonEvent(tree, key, index));
                    parentHtml.push(createTableHtml(html));
                });
                html.length = 0;
            }
            else if (prop[key].ishash) {
                if (html[0]) {
                    parentHtml.push(createTableHtml(html));
                }
                Object.keys(prop[key]).forEach(secondKey => {
                    if (secondKey === 'ishash') {
                        return;
                    }
                    html.push(this.getContents(tree[key], secondKey, prop[key][secondKey]));
                });
                parentHtml.push(`<hr><div>${this.createItemName(key)}</div>`);
                parentHtml.push(createTableHtml(html));
            }
            else {
                if (!html[0]) {
                    html.push('<hr>');
                }
                html.push(this.getContents(tree, key, prop[key]));
            }
        });

        if (html.length) {
            parentHtml.push(createTableHtml(html));
        }

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