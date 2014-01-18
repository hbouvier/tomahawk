module.exports = function () {
    var express  = require('express'),
        connect  = require('connect'),
        http     = require('http'),
        socketio = require('socket.io'),
        spawn    = require('child_process').spawn;


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
                        if ($this.logger && $this.logger.log) {
                            $this.logger.log('info', message.replace(/\n/, ''), $this.meta);
                        }
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
            if ($this.config.context) {
                $this.app.use($this.config.context, express.static($this.config.www));
            }
            if ($this.level === 'error') {
                $this.app.use(express.errorHandler());
            } else {
                $this.app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
            }
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
        var cgi = $this.config.cgi instanceof Array ? $this.config.cgi : (typeof($this.config.cgi) === 'string' ? [$this.config.cgi] : []);
        console.log('cgi:', cgi);

        function createRouteCGI(app, cgi) {
           var method  = cgi.method || "GET";

           function handler(req, res) {
                var command = cgi.command;
                var args    = cgi.args || [];
                console.log('spawn:', command, ', args:', args)
                var child   = spawn(command, args);

                child.stdin.setEncoding('utf8');

                child.stderr.on('data', function (data) {
                    console.log('stderr:', ''+data);
                    res.write(data);
                });
                child.stdout.on('data', function (data) {
                    console.log('stdout:', ''+data);
                    res.write(data);
                });

                child.on('close', function (code) {
                    console.log('close');
                    res.end();
                });
                req.on('data', function (data) {
                    console.log('read:', ''+data);
                    child.stdin.write(data);
                });
            }
            if (method === 'GET') {
                app.get(cgi.route, handler);
            } else if (method === 'POST') {
                app.post(cgi.route, handler);
            } else if (method === 'PUT') {
                app.put(cgi.route, handler);
            } else if (method === 'DELETE') {
                app.delete(cgi.route, handler);
            }

        }
        for (i = 0 ; i < cgi.length ; ++i) {
            createRouteCGI($this.app, cgi[i]);
        }
    }

    Tomahawk.prototype.start = function() {
        this.server.listen(this.config.port, this.config.ip);
        this.logger.log('info', 'listent|%s|IP=%s|PORT=%d', this.config.context, this.config.ip, this.config.port, this.meta);
        return this.app;
    }

    ///////////////////////////////////////////////////////////////////////////
    //
    function _parseHTTPHeaders(headers, logger, meta) {
        var regex  = /\s*([^\s:]*)\s*:\s*([^\s\n\r]*)/,
            parsedHeaders = [];
        headers = headers instanceof Array ? headers : [headers ? headers : ""];
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