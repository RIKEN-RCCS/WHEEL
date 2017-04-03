/**
 * plug container class
 */
class SvgContainer {
    /**
     * container object
     */
    private readonly container: { [name: string]: SvgPlugBase } = {};

    /**
     * add plug
     * @param plug plug instance
     */
    public add(plug: SvgPlugBase): void {
        const name = plug.name();
        if (this.container[name]) {
            throw new Error('index is duplicated');
        }
        this.container[name] = plug;
    }

    /**
     * remove specified name plug
     * @param name plug name
     */
    public remove(name: string): void;

    /**
     * remove specified plug
     * @param plug plug
     */
    public remove(plug: SvgPlugBase): void;

    /**
     * remove plug
     * @param object plug name or plug
     */
    public remove(object: (string | SvgPlugBase)): void {
        let name: string;
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
     * whther specified name plug is exist or not
     * @param name plug name
     * @return whther specified name plug is exist or not
     */
    public isExist(name: string): boolean;

    /**
     * whther specified plug is exist or not
     * @param plug plug
     * @return whther specified name plug is exist or not
     */
    public isExist(plug: SvgPlugBase): boolean;

    /**
     * whther specified plug or plug name is exist or not
     * @param object plug or plug name
     * @return whther specified name plug is exist or not
     */
    public isExist(object: (string | SvgPlugBase)): boolean {
        let name: string;
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
    public find(name: string): SvgPlugBase {
        return this.container[name];
    }

    /**
     * move all plug to front
     */
    public front(): void {
        Object.keys(this.container).forEach(key => {
            this.container[key].front();
        });
    }

    /**
     * Performs the specified action for plug in this array
     * @param callback calls function one time for each element in the array
     */
    public forEach(callback: ((plug) => void)) {
        Object.keys(this.container).forEach(key => {
            callback(this.container[key]);
        });
    }

    /**
     * clear container
     */
    public clear(): void {
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
    public findFromHashCode(hashcode: number, filepath?: string): SvgPlugBase[] {
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
    public count(callback: ((plug: SvgPlugBase) => boolean)): number {
        let counter = 0;
        Object.keys(this.container).forEach(key => {
            if (callback(this.container[key])) {
                counter++;
            }
        });
        return counter;
    }
}