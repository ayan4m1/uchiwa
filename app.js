'use strict';

/**
 * Module dependencies.
 */
var fs = require('fs');
var yargs = require('yargs')
    .describe('c', 'Load a config (file)')
    .alias('c', 'config')
    .alias('c', 'config-file')
    .alias('c', 'config_file')
    .default('c', './config.json');
var argv = yargs.argv;

// Check config file
if (!fs.existsSync(argv.c)) {
  yargs.showHelp();
  console.log('Config file must exist and be readable.');
  process.exit(1);
}
try {
  var config = require(argv.c);
} catch (e) {
  console.log('Syntax error with the config file ' + argv.c);
  process.exit(1);
}

var express = require('express'),
  http = require('http'),
  path = require('path'),
  async = require('async'),
  _ = require('underscore'),
  app = express(),
  server = http.createServer(app);

var io = require('socket.io')(server);
var Dc = require('./lib/dc.js').Dc;
var clients = {};


/**
 * Initialize configuration
 */
if (!_.isArray(config.sensu)) {
  config.sensu = [config.sensu];
  config.sensu[0].name = config.sensu[0].host;
}
var port = config.uchiwa.port || 3000;
var host = config.uchiwa.host || '0.0.0.0';
config.uchiwa.refresh = config.uchiwa.refresh || 10000;

/**
 * App configuration
 */
app.set('port', process.env.PORT || port);
app.set('host', process.env.HOST || host);
app.engine('.html', require('ejs').__express);
app.set('views', path.join(__dirname, 'public'));
app.set('view engine', 'html');
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Authentication
 */
if (config.uchiwa.user && config.uchiwa.pass) {
  var basicAuth = express.basicAuth(function (username, password) {
    return (username === config.uchiwa.user && password === config.uchiwa.pass);
  }, 'Restrict area, please identify');
  app.all('*', basicAuth);
}

/**
 * Error handling
 * DEBUG=* NODE_ENV=development node app.js
 */
if ('development' === process.env.NODE_ENV) {
  console.log('Debugging enabled.');
  app.use(express.errorHandler({showStack: true, dumpExceptions: true}));
}

/* jshint ignore:start */
app.use(function (err, req, res, next) {
  console.log(err);
  res.send(500);
});
/* jshint ignore:end */

// Remove passwords from public config
var publicConfig = JSON.parse(JSON.stringify(config));
publicConfig.uchiwa.user = '*****';
publicConfig.uchiwa.pass = '*****';
_.each(publicConfig.sensu, function (element) {
  element.user = '*****';
  element.pass = '*****';
});

var sensu = {};
var datacenters = [];
config.sensu.forEach(function (configuration) {
  datacenters.push(new Dc(configuration));
});

var pull = function () {
  var attributes = ['checks', 'clients', 'events', 'stashes'];
  attributes.forEach(function(attribute) {
    sensu[attribute] = [];
  });
  sensu.dc = [];
  
  async.eachSeries(datacenters, function (datacenter, nextDc) {
    datacenter.pull(function () {
        var aggregate = function (callback) {
          async.each(attributes, function (attribute, nextAttribute) {
            async.each(datacenter.sensu[attribute], function (item, nextItem) {
              item.dc = datacenter.name;
              sensu[attribute].push(item);
              nextItem();
            }, function () {
              nextAttribute();
            });
          }, function () {
            callback();
          });
        };
        aggregate(function () {
          datacenter.build();
          sensu.dc.push({
            name: datacenter.name,
            style: datacenter.style,
            clients: datacenter.clients,
            events: datacenter.events,
            stashes: datacenter.stashes,
            checks: datacenter.checks,
            info: datacenter.info
          });
          nextDc();
        });
      },
      function (messageContent) {
        io.emit('messenger', {
          content: messageContent
        });
      }
    );
  }, function () {
    sensu.subscriptions = [];
    async.each(sensu.clients, function (client, nextClient) {
      if(_.isObject(client.subscriptions)){
        async.each(client.subscriptions, function (subscription, nextSubscription) {
          if(sensu.subscriptions.indexOf(subscription) === -1) { sensu.subscriptions.push(subscription); }
          nextSubscription();
        });
      }
      nextClient();
    }, function() {
      io.emit('sensu', {content: JSON.stringify(sensu)});
    });
    
  });
};

// Perform a pull on start and every config.uchiwa.refresh milliseconds
setInterval(pull, config.uchiwa.refresh);
pull();

// Return DC object and check client if any specified
var getDc = function (data, callback) {
  if (datacenters.length === 0) {
    return callback('<strong>Error!</strong> No datacenters found.');
  }
  var dc = datacenters.filter(function (e) {
    return e.name === data.dc;
  });
  if (dc.length !== 1) {
    return callback('<strong>Error!</strong> The datacenter ' + data.dc + ' was not found.');
  }
  if (_.has(data, 'client')) {
    if (dc[0].sensu.clients.length === 0) {
      return callback('<strong>Error!</strong> No clients found.');
    }
    var client = dc[0].sensu.clients.filter(function (e) {
      return e.name === data.client;
    });
    if (client.length !== 1) {
      return callback('<strong>Error!</strong> The client ' + data.client + ' was not found.');
    }
  }
  callback(null, dc[0]);
};


/**
 * Listen for Socket.IO messages
 */
io.on('connection', function (socket) {
  // Keep track of active clients
  clients[socket.id] = socket;

  // Remove client on disconnection
  socket.on('disconnect', function () {
    delete clients[socket.id];
  });

  socket.on('get_sensu', function () {
    clients[socket.id].emit('sensu', {content: JSON.stringify(sensu)});
  });

  socket.on('get_client', function (data) {
    getDc(data, function (err, result) {
      if (err) {
        clients[socket.id].emit('messenger', {content: JSON.stringify({'type': 'error', 'content': err})});
      }
      else {
        result.getClient(data.client, function (err, result) {
          if (err) {
            clients[socket.id].emit('messenger', {
              content: JSON.stringify({
                'type': 'error',
                'content': '<strong>Error!</strong> ' + err
              })
            });
          }
          else {
            clients[socket.id].emit('client', {content: JSON.stringify(result)});
          }
        });
      }
    });
  });

  socket.on('delete_client', function (data) {
    data = JSON.parse(data);
    getDc(data, function (err, result) {
      if (err) {
        clients[socket.id].emit('messenger', {content: JSON.stringify({'type': 'error', 'content': err})});
      }
      else {
        result.sensu.delete('clients', data.payload, function (err) {
          if (err) {
            clients[socket.id].emit('messenger', {
              content: JSON.stringify({
                'type': 'error',
                'content': '<strong>Error!</strong> The client was not deleted. Reason: ' + err
              })
            });
          }
          else {
            clients[socket.id].emit('messenger', {
              content: JSON.stringify({
                'type': 'success',
                'content': '<strong>Success!</strong> The client has been deleted.'
              })
            });
          }
        });
      }
    });
  });

  socket.on('create_stash', function (data) {
    data = JSON.parse(data);
   
    // Set timestamp
    var timestamp = Math.floor(new Date()/1000);
    data.payload.content.timestamp = timestamp;
   
    getDc(data, function (err, result) {
      if (err) {
        clients[socket.id].emit('messenger', {content: JSON.stringify({'type': 'error', 'content': err})});
      }
      else {
        result.sensu.post('stashes', JSON.stringify(data.payload), function (err) {
          if (err) {
            clients[socket.id].emit('messenger', {
              content: JSON.stringify({
                'type': 'error',
                'content': '<strong>Error!</strong> The stash was not created. Reason: ' + err
              })
            });
          }
          else {
            clients[socket.id].emit('messenger', {
              content: JSON.stringify({
                'type': 'success',
                'content': '<strong>Success!</strong> The stash has been created.'
              })
            });
          }
        });
      }
    });
  });

  socket.on('delete_stash', function (data) {
    data = JSON.parse(data);
    getDc(data, function (err, result) {
      if (err) {
        clients[socket.id].emit('messenger', {content: JSON.stringify({'type': 'error', 'content': err})});
      }
      else {
        result.sensu.delete('stashes', data.payload, function (err) {
          if (err) {
            clients[socket.id].emit('messenger', {
              content: JSON.stringify({
                'type': 'error',
                'content': '<strong>Error!</strong> The stash was not deleted. Reason: ' + err
              })
            });
          }
          else {
            clients[socket.id].emit('messenger', {
              content: JSON.stringify({
                'type': 'success',
                'content': '<strong>Success!</strong> The stash has been deleted.'
              })
            });
          }
        });
      }
    });
  });

  socket.on('resolve_event', function (data) {
    data = JSON.parse(data);
    getDc(data, function (err, result) {
      if (err) {
        clients[socket.id].emit('messenger', {content: JSON.stringify({'type': 'error', 'content': err})});
      }
      else {
        result.sensu.post('resolve', JSON.stringify(data.payload), function (err) {
          if (err) {
            clients[socket.id].emit('messenger', {
              content: JSON.stringify({
                'type': 'error',
                'content': '<strong>Error!</strong> The check was not resolved. Reason: ' + err
              })
            });
          }
          else {
            clients[socket.id].emit('messenger', {
              content: JSON.stringify({
                'type': 'success',
                'content': '<strong>Success!</strong> The check has been resolved.'
              })
            });
          }
        });
      }
    });
  });

  socket.on('get_info', function () {
    clients[socket.id].emit('info', {content: JSON.stringify(publicConfig)});
  });

});


/**
 * Start server
 */
server.listen(app.get('port'), app.get('host'), function () {
  console.log('Uchiwa is now listening on %s:%s', app.get('host'), app.get('port'));
});
