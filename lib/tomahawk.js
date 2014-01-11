module.exports = function () {
    var express  = require('express'),
        connect  = require('connect'),
        app      = express(),
        server   = require('http').createServer(app),
        io       = require('socket.io').listen(server),
        logger   = null,
        meta     = null;


    function parseHTTPHeaders(headers) {
        var regex  = /\s*([^\s:]*)\s*:\s*([^\s\n\r]*)/,
            parsedHeaders = [];
        for (var i = 0 ; i < headers.length ; ++i) {
            var header = headers[i];
            var match = regex.exec(header);
            if (match && match.length === 3) {
                parsedHeaders.push({name:match[1], value:match[2]});
                logger.log('debug', 'http-header|%s : %s', match[1], match[2], meta);
            } else {
                logger.log('warn', 'http-header|IGNORING-INVALID-HEADER|%s|expecting=type : value', header, meta);
            }
        }
        return parsedHeaders;
    }

    function start(config) {
        meta   = config.meta;
        logger = config.logger;
        config.headers = parseHTTPHeaders(config.headers);

        app.configure(function () {
            app.use(express.logger({
                stream : {
                    write : function (message, encoding) {
                        logger.log('info', message.replace(/\n/, ''));
                    }
                }
            }));
            app.use(function(req, res, next) {
                for (var i = 0 ; i < config.headers.length ; ++i) {
                    res.setHeader(config.headers[i].name, config.headers[i].value);
                }
                return next();
            });
            app.use(config.context, express.static(config.www));
            app.use(express.errorHandler());
        });

        process.on('exit', function() {
            logger.log('info', 'EXIT', meta);
            process.exit();
        });
        process.on( 'SIGINT', function() {
            logger.log('warn', 'SIGINT', meta);
            process.exit();
        });

        io.configure(function () {
            io.set('log level', {silly:5, debug:5, verbose:4, info:3, warn:2, error:1}[config.level]);
            io.set("transports", ["jsonp-polling"]);
            io.set("polling duration", 10);
        });

        server.listen(config.port);
        logger.log('info', 'listent|%s|PORT=%d', config.context, config.port, meta);
    }

    return {
        start : start
    };
}();