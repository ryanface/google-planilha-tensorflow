var ipaddress = '192.168.100.9';
var port      = 4100;
var count     = 0;

var ryan    = require( './lib_google' );
var mongoAPI    = require( './lib_mongo' );

io = require('socket.io',{'transports': ['websocket', 'polling']}).listen(port);
//io.set('transports', ["websocket", "polling"]);
var data = io.on('connection', function (socket) {
    count++;
    console.log('connect',count);
    socket.join('room');

    mongo = new mongoAPI(socket);
    ryan.setMongo(mongo);

    socket.on('event', function(data){ console.log('event',data); });
    socket.on('disconnect', function(){
       count--;
       console.log('disconnect',count);
       mongo.closeConnection()
       socket.leave('room');
    });

    /**********************************************/
    /***********          GOOGLE            *******/
    /**********************************************/
    socket.on('open_connect', function(a){
           console.log('socket_open_connect');
           ryan.open_connect(socket,mongo,a);
    });
    socket.on('save', function(a){
           console.log('socket_save');
           mongo.save(a);
    });

});
