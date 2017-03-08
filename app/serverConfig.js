"use strict";
var fs = require("fs");
var path = require("path");
/**
 *
 */
var ServerConfig = (function () {
    function ServerConfig() {
    }
    /**
     *
     */
    ServerConfig.getConfig = function () {
        if (this.config != null) {
            return this.config;
        }
        try {
            var serverConfig = fs.readFileSync(path.join(__dirname, './config/server.json'));
            this.config = JSON.parse(serverConfig.toString());
            return this.config;
        }
        catch (err) {
            return null;
        }
    };
    return ServerConfig;
}());
module.exports = ServerConfig;
//# sourceMappingURL=serverConfig.js.map