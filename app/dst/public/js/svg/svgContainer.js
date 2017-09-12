/**
 * plug container class
 */
class SvgContainer {
    constructor() {
        /**
         * container object
         */
        this.container = {};
    }
    /**
     * add plug
     * @param plug plug instance
     */
    add(plug) {
        const name = plug.name();
        if (this.container[name]) {
            throw new Error('index is duplicated');
        }
        this.container[name] = plug;
    }
    /**
     * remove plug
     * @param object plug name or plug
     */
    remove(object) {
        let name;
        if (typeof object === 'string') {
            name = object;
        }
        else {
            name = object.name();
        }
        if (this.container[name]) {
            this.container[name].delete();
            this.container[name] = null;
            delete this.container[name];
        }
    }
    /**
     * whther specified plug or plug name is exist or not
     * @param object plug or plug name
     * @return whther specified name plug is exist or not
     */
    isExist(object) {
        let name;
        if (typeof object === 'string') {
            name = object;
        }
        else {
            name = object.name();
        }
        return this.container[name] != null;
    }
    /**
     * find specified name plug
     * @param name plug name
     * @return found plug
     */
    find(name) {
        return this.container[name];
    }
    /**
     * move all plug to front
     */
    front() {
        Object.keys(this.container).forEach(key => {
            this.container[key].front();
        });
    }
    /**
     * Performs the specified action for plug in this array
     * @param callback calls function one time for each element in the array
     */
    forEach(callback) {
        Object.keys(this.container).forEach(key => {
            callback(this.container[key]);
        });
    }
    /**
     * clear container
     */
    clear() {
        Object.keys(this.container).forEach(key => {
            this.remove(key);
        });
    }
    /**
     * find plug
     * @param hashcode task hash code
     * @param filepath file path string
     * @param find plug list
     */
    findFromHashCode(hashcode, filepath) {
        return Object.keys(this.container).filter(key => {
            const task = this.container[key].getHashCode();
            if (filepath === undefined) {
                return task === hashcode;
            }
            else {
                const file = this.container[key].getFilepathFromTree();
                return (task === hashcode && file === filepath);
            }
        }).map(key => this.container[key]);
    }
    /**
     * get matched count
     * @param callback make a match callback function
     * @param matched count
     * @return get matched count
     */
    count(callback) {
        let counter = 0;
        Object.keys(this.container).forEach(key => {
            if (callback(this.container[key])) {
                counter++;
            }
        });
        return counter;
    }
}
//# sourceMappingURL=svgContainer.js.map