[![Build Status](https://travis-ci.org/hbouvier/tomahawk.png)](https://travis-ci.org/hbouvier/tomahawk)
[![dependency Status](https://david-dm.org/hbouvier/tomahawk/status.png?theme=shields.io)](https://david-dm.org/hbouvier/tomahawk#info=dependencies)
[![devDependency Status](https://david-dm.org/hbouvier/tomahawk/dev-status.png?theme=shields.io)](https://david-dm.org/hbouvier/tomahawk#info=devDependencies)
[![NPM version](https://badge.fury.io/js/tomahawk.png)](http://badge.fury.io/js/tomahawk)

Tomahawk
========

Tomahawk provide you with a minimal http server, that can be started on the command line to serve static content.

## To install 

npm install -g tomahawk


## How to use the Tomahawk web server

- To serve the current directory using the default port 8080

    tomahawk

- To serve "web/public" from the current directory using the default port 8080

	tomahawk --www=web/public

- To use a different port (e.g. 3000)
	
	tomahawk --port=3000

- How can I prefix my static content with MyApp (e.g. http://localhost:8080/MyApp insead of the default http://localhost:8080/)

	tomahawk --context=/MyApp

- How about less logging?

	tomahawk --level=error

## How can I add CORS http headers

	tomahawk --config=config.development.json
or

    tomahawk --headers='["Access-Control-Allow-Origin:*","Access-Control-Allow-Methods:GET,PUT,POST,DELETE","Access-Control-Allow-Headers:Content-Type","X-Frame-Options:ALLOWALL"]'
    
## start a CGI
    tomahawk --cgi='[{"route":"/echo","method":"POST","command":"/bin/sh", "args":["-c", "read line ; echo $line"], "encoding":"utf8"}]'
    echo allo | curl -X POST -d @- http://localhost:8080/echo


- Can I save the configration, to avoid typing it every time?

	1) Either create a config.json and save it in the current working directory
	2) Create your configuration file (e.g. tommy.cfg) and :
		tomahawk --config=tommy.cfg
	or
		export CONFIG=tommy.cfg
		tomahawk

	Your configuration file should look like:

	    {
            "level"      : "error",
            "www"        : ".",
            "context"    : "/MyApp",
            "port"       : 9000,
            "headers"    : [
                "Access-Control-Allow-Origin:*",
                "X-Frame-Options:ALLOWALL"
            ],
            "cgi" : [
                {
                    "route"   : "/version",
                	"method"  : "GET",
                	"command" : "/bin/sh",
                	"args"    : ["-c",  "echo '{\"version\":\"1.0.0\"}'"]
                }
            ]
         }

## How can I include tomahawk into my project as a module to server REST routes?

In your server.js add:

    var app = require('tomahawk').create({port:8080,routes:['./lib/routes']}).start();

Then create a file in './lib/routes.js' with:

    module.exports = function () {
    
        function routes(app, config, io) {
            var captains = {
                "jim"    : "James Tiberius "Jim" Kirk",
                "picard" : "Jean-Luc Picard"
            };
            
            var starShips : {
                "jim"    : "NCC1701-A",
                "picard" : "NCC1701-D"
                
            };
                            
            // GET
            app.get('/api/v1/capitain/:id?', function (req, res) {
                var withStarship = req.query.starship === 'true';
                
                if (req.params.id) {
                    res.json(withStarship ? 
                        {id:req.params.id,name:capitains[req.params.id], starship:starShips[req.params.id]} : 
                        {id:req.params.id,name:capitains[req.params.id]});
                } else {
                    res.json(captains); 
                }
                res.end();
            });
    
            // PUT 
            app.put('/api/v1/capitain/:id', function (req, res) {
                captains.push({req.params.id, req.body});
                io.sockets.emit('new:captain', {id:req.params.id, name:req.body});  // Optional, if you want to use websocket
            });
    
            // DELETE
            app.delete('/dns/api/v1/name/:id', function (req, res) {
                delete captains[req.params.id];
                io.sockets.emit('del:captain', {id:req.params.id}); // Optional, if you want to use websocket
                res.json({id:req.params.id,status:"OK"});
                res.end();
            });
        }
    
        return routes;
    }();
    
