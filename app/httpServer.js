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
     * @param port port number
     * @return http server
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
            var filename = HttpServer.convertReqpathToFilepath(pathname);
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
     * convert request path to file path
     * @param requestPath request path
     * @return converted file path
     */
    HttpServer.convertReqpathToFilepath = function (requestPath) {
        if (requestPath === '/') {
            requestPath = '/swf/home.html';
        }
        return path.join(__dirname, 'public', requestPath);
    };
    /**
     * default port number
     */
    HttpServer.portNumber = process.env.port || 1337;
    /**
     * encoding string
     */
    HttpServer.encoding = 'UTF-8';
    /**
     * HTTP response header options
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
    return HttpServer;
}());
module.exports = HttpServer;
//# sourceMappingURL=httpServer.js.map