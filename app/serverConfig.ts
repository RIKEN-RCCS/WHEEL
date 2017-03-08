import fs = require('fs');
import path = require('path');

/**
 *
 */
class ServerConfig {
    /**
     *
     */
    private static config;

    /**
     *
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