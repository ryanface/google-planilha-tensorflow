var ipaddress = '192.168.100.9';
var port      = 4100;
var count     = 0;

var ryan      = require( './lib/lib_google' );
var mongoAPI  = require( './lib/lib_mongo' );
var brainAPI  = require( './lib/lib_brain' );

var people        = {};
var createRoom = function(room){
    if(people[room] == undefined)
       people[room] = {};
}

io = require('socket.io',{'transports': ['websocket', 'polling']}).listen(port);
//io.set('transports', ["websocket", "polling"]);
var data = io.on('connection', function (socket) {
    count++;
    console.log('connect',count);

    socket.join('room');
    socket.room = 'room';
    createRoom('room');
    people[socket.room][socket.id] = {'name':'name'};
    console.log('Rooms:',people);
    if(people[socket.room]){
        people[socket.room][socket.id].mongo = new mongoAPI(socket);
        people[socket.room][socket.id].brain = new brainAPI(socket,people[socket.room][socket.id].mongo);
        ryan.setMongo(people[socket.room][socket.id].mongo);
    }
    socket.on('event', function(data){ console.log('event',data); });
    socket.on('disconnect', function(){
           count--;
           console.log('disconnect',count);
           people[socket.room][socket.id].mongo.closeConnection()
           delete people[socket.room][socket.id];
           socket.leave('room');
    });

    /**********************************************/
    /***********          GOOGLE            *******/
    /**********************************************/
    socket.on('open_connect', function(a){
           console.log('socket_open_connect');
           ryan.open_connect(socket,people[socket.room][socket.id].mongo,a);
    });
    socket.on('save', function(a){
           console.log('socket_save');
           people[socket.room][socket.id].mongo.save(a);
    });
    socket.on('proc', function(){
           console.log('socket_proc');
           people[socket.room][socket.id].mongo.process();
    });
    socket.on('net', function(a){
           console.log('socket_net');
           people[socket.room][socket.id].brain.open(a);
    });
    socket.on('send', function(a){
           console.log('socket_send');
           people[socket.room][socket.id].brain.send(a);
    });
});
