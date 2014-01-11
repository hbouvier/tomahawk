module.exports = function () {
    var express  = require('express'),
        connect  = require('connect'),
        app      = express(),
        server   = require('http').createServer(app),
        io       = require('socket.io').listen(server);

    function start(config) {
        var logger = config.logger,
            meta   = config.meta;

        app.configure(function () {
            app.use(express.logger('dev'));
            app.use(function(req, res, next) {
                /*
                	res.setHeader("Access-Control-Allow-Origin", "*");
                	res.setHeader("X-Frame-Options", "ALLOWALL");
                */
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