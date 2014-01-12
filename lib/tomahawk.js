module.exports = function () {
    var express  = require('express'),
        connect  = require('connect'),
        http     = require('http'),
        socketio = require('socket.io');

    function Tomahawk(config) {
        var $this    = this;
        this.config  = config;
        this.meta    = this.config.meta;
        this.logger  = this.config.logger;
        this.headers = _parseHTTPHeaders(this.config.headers, this.logger, this.meta);

        this.app     = express();
        this.server  = http.createServer(this.app);
        this.io      = socketio.listen(this.server);

        this.app.configure(function () {
            $this.app.use(express.logger({
                stream : {
                    write : function (message, encoding) {
                        $this.logger.log('info', message.replace(/\n/, ''), $this.meta);
                    }
                }
            }));    //app.use(express.logger('dev'));


            var bodyparser = $this.config.bodyparser instanceof Array ? $this.config.bodyparser : (typeof($this.config.bodyparser) === 'string' ? [$this.config.bodyparser] : []);
            for (var i = 0 ; i < bodyparser.length ; ++i) {
                require(bodyparser[i])($this.app, $this.config);
            }

            $this.app.use(function(req, res, next) {
                for (var i = 0 ; i < $this.headers.length ; ++i) {
                    res.setHeader($this.headers[i].name, $this.headers[i].value);
                }
                return next();
            });
            $this.app.use($this.config.context, express.static($this.config.www));
            $this.app.use(express.errorHandler());
        });

        process.on('exit', function() {
            $this.logger.log('info', 'EXIT', $this.meta);
            process.exit();
        });
        process.on('SIGINT', function() {
            $this.logger.log('warn', 'SIGINT', $this.meta);
            process.exit();
        });

        $this.io.configure(function () {
            $this.io.set('log level', {silly:5, debug:5, verbose:4, info:3, warn:2, error:1}[$this.config.level]);
            $this.io.set("transports", ["jsonp-polling"]);
            $this.io.set("polling duration", 10);
        });

        var routes = $this.config.routes instanceof Array ? $this.config.routes : (typeof($this.config.routes) === 'string' ? [$this.config.routes] : []);
        for (var i = 0 ; i < routes.length ; ++i) {
            require(routes[i])($this.app, $this.config);
        }
    }

    Tomahawk.prototype.start = function() {
        this.server.listen(this.config.port);
        this.logger.log('info', 'listent|%s|PORT=%d', this.config.context, this.config.port, this.meta);
        return this.app;
    }

    ///////////////////////////////////////////////////////////////////////////
    //
    function _parseHTTPHeaders(headers, logger, meta) {
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

    function create(config) {
        return new Tomahawk(config);
    }

    return {
        create : create
    };
}();