import fs = require('fs');
import path = require('path');

/**
 * server config data class
 */
class ServerConfig {
    /**
     * config data
     */
    private static config;

    /**
     * get configdata
     * @return config data
     */
    public static getConfig() {
        if (this.config != null) {
            return this.config;
        }
        try {
            const serverConfig = fs.readFileSync(path.join(__dirname, './config/server.json'));
            this.config = JSON.parse(serverConfig.toString());
            return this.config;
        }
        catch (err) {
            return null;
        }
    }
}

export = ServerConfig;