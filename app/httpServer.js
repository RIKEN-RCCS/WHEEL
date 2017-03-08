"use strict";
var http = require("http");
var fs = require("fs");
var url = require("url");
var path = require("path");
var qs = require("querystring");
var logger = require("./logger");
/**
 * HTTP server class
 */
var HttpServer = (function () {
    function HttpServer() {
    }
    /**
     * start HTTP server
     * @param port
     * @returns Server instance
     */
    HttpServer.start = function (port) {
        if (port != null) {
            this.portNumber = port;
        }
        this.server = http.createServer(requestListener);
        this.server.listen(this.portNumber);
        logger.info("start http server. port=" + this.portNumber + ".");
        return this.server;
        function requestListener(request, response) {
            var requestUrl = url.parse(request.url, true);
            var pathname = requestUrl.pathname;
            var filename = HttpServer.createFilepath(pathname);
            fs.readFile(filename, readFileCallback);
            function readFileCallback(err, data) {
                if (err) {
                    logger.error(err);
                    response.writeHead(404, { 'Content-Type': 'text/plain' });
                    response.end('not found');
                    return;
                }
                var extension = path.extname(pathname);
                if (request.method === 'GET') {
                    response.writeHead(200, HttpServer.headers[extension]);
                    response.end(data);
                }
                else if (request.method === 'POST') {
                    var body_1 = [];
                    request.on('data', function (data) {
                        body_1.push(data);
                    });
                    request.on('end', function () {
                        var post = qs.parse(body_1.join());
                        var cookies = Object.keys(post).map(function (key) { return key + "=" + encodeURIComponent(path.normalize(post[key])); });
                        response.setHeader('Set-Cookie', cookies);
                        response.writeHead(200, HttpServer.headers[extension]);
                        response.end(data.toString());
                    });
                }
            }
        }
    };
    /**
     * create file path
     * @param pathname request url path name
     * @returns file path string
     */
    HttpServer.createFilepath = function (pathname) {
        if (pathname === '/') {
            pathname = '/swf/home.html';
        }
        return path.join(__dirname, 'public', pathname);
    };
    return HttpServer;
}());
/**
 * port number
 */
HttpServer.portNumber = process.env.port || 1337;
/**
 * encoding
 */
HttpServer.encoding = 'UTF-8';
/**
 * HTTP response header
 */
HttpServer.headers = {
    '.htm': { 'Content-Type': 'text/html', charset: HttpServer.encoding },
    '.html': { 'Content-Type': 'text/html', charset: HttpServer.encoding },
    '.css': { 'Content-Type': 'text/css', charset: HttpServer.encoding },
    '.js': { 'Content-Type': 'text/javascript', charset: HttpServer.encoding },
    '.json': { 'Content-Type': 'text/javascript', charset: HttpServer.encoding },
    '.jpg': { 'Content-Type': 'text/jpeg' },
    '.jpeg': { 'Content-Type': 'text/jpeg' },
    '.png': { 'Content-Type': 'text/png' }
};
module.exports = HttpServer;
//# sourceMappingURL=httpServer.js.map