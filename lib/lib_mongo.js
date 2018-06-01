var mongodb = require('mongodb');
var configuration = require('../conf/configuration');

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
              //console.log(i,item);
              this.db.collection('caso').save(item,(err,ok)=>{ if(err)console.log('save:',i,err,ok); });
        }
      }
      this.SOCKET.emit("save", "ok");
      this.process();
    }
    async process(){
        await this.db.collection('warning').remove();

        var cursor = await this.db.collection('caso').find({});
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            console.log('doc.dataRegistro',doc.dataRegistro);
            if(doc.dataRegistro != undefined){
              var parts = doc.dataRegistro.split(" ")[0].split("/");
              var dt = new Date(
                      parseInt(parts[2], 10),
                      parseInt(parts[1], 10) - 1,
                      parseInt(parts[0], 10)
                  );
              this.db.collection('caso').update(
                  {"_id" : doc._id},
                  {"$set" : {"created_at":dt}}
              );
            }
        };
        //
        var cursor = await this.db.collection('caso').aggregate(
          {$group: {_id: {created_at:'$created_at'}, casos: {$sum: 1}}},
          {$sort: {_id: -1}}
        );
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            doc.data= doc._id.created_at;
            delete doc._id;
            //print(doc)
            await this.db.collection('warning').save(doc);
        }
        //
        this.SOCKET.emit("save", "process ok");
    }
}

module.exports = oAPI;
