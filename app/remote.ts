import ssh2 = require('ssh2');
import logger = require('./logger');

module Remote {

    interface RemoteFtp {
        connect(config: ssh2.ConnectConfig, ifSucceed: (() => void), ifFailed: (() => void)): void;
    }

    export class Ssh implements RemoteFtp {

        private _isConnected: boolean = false;
        public get isConnected(): boolean {
            return this._isConnected;
        }

        /**
         * ssh connection
         */
        public connect(config: ssh2.ConnectConfig, ifSucceed: (() => void), ifFailed: (() => void)): void {
            logger.info(`start ssh connect ${config.username}@${config.host}`);
            const client = new ssh2.Client();
            client
                .on('connect', () => {
                    logger.debug(`connected`);
                })
                .on('ready', () => {
                    client.sftp((err: Error, sftp: ssh2.SFTPWrapper) => {
                        if (err) {
                            logger.error(err);
                        }
                        else {
                            ifSucceed();
                        }
                        client.end();
                    });
                })
                .on('error', (err) => {
                    logger.error(err);
                    ifFailed();
                })
                .on('close', (had_error) => {
                    logger.debug('connection close');
                })
                .on('end', () => {
                    logger.debug('end remote session.');
                })
                .connect(config);
        }
    }
}
export = Remote;