declare module 'sessions' {
    import util = require("util");
    import events = require("events");
    import fs = require("fs");
    import path = require("path");

    export let stores: Object;
    //export let sessionStores: Object;

    export class Sessions extends events.EventEmitter {
        (store, opts, storeOpts): Sessions;
        total(): Number;
        get(uid: string, cb: Function): Object;
        create(): Object;
        uid(): String;
        httpRequest(req: Object, res: Object, data: Object, cb: Function): Object;
        checkExpiration();
    }

    export function parseCookies(req:Object): Object;
}