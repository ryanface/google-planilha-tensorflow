var mongodb = require('mongodb');
var configuration = require('./conf/configuration');

class oAPI{
    constructor(socket){
        this.db;
        this.databaseUrl;
        this.SOCKET = socket;
        //
        this.open_mongodb();
    }
    async open_mongodb(callback=undefined,params=undefined){
      //npm uninstall mongodb --save
      //npm install mongodb@2.2.33 --save
        const MongoClient = require('mongodb').MongoClient;
        const url = 'mongodb://'+configuration.mongoConnection+'/'+configuration.mongoDB;
        await MongoClient.connect(url, (err, client) =>{
            if(err){
                console.log("MongoDB Connected error:",err);
                //callback(err,false);
            }
            if(!err){
                console.log("MongoDB Session:"+this.SOCKET.id+" Connected successfully to server");
                // set client
                this.db = client;
                //callback(client,true);
            }
        });
    }
    closeConnection(){
       if(this.db != undefined){
        this.db.close();
        this.db = undefined;
        console.log("MongoDB Session:"+this.SOCKET.id+" Close");
      }
    }
    query(collection,find,limit){
       this.db.collection(collection).find(find).limit(limit).skip(1,
          function(err,docs){
            if(!err){
               return docs;
            }else console.log(err);
          }
       );
    }
    save(data){
      let fields = data[0];
      let item = [];
      for(let i in data){
        if(i > 0){
              item = [];
              for(let j in data[0]){
                item[data[0][j]] = data[i][j];
              }
              item = Object.assign({},item);
              console.log(i,item);
              this.db.collection('caso').save(item,(err,ok)=>{ if(err)console.log('save:',i,err,ok); });
        }
      }
      this.SOCKET.emit("save", "ok");
    }

}

module.exports = oAPI;
