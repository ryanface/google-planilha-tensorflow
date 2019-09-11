require('@tensorflow/tfjs-node');
const tf = require('@tensorflow/tfjs');

 /*
    Classe API
 */
class oAPI{
    constructor(socket,mongo){
        this.SOCKET    = socket;
        this.MONGO     = mongo;
        /*
         Carrega os dados para treinamento.
        */
        //scenes=6  ,days=6
        this.train = this.dataTrain(6,6);
        /*
         Configuração básica para a rede. 
        */
        this.confPredictTensor();
    }
    /*
     Função que cria a rede e inicia o treinamento.
    */    
    async confTensor(train){
       return new Promise( (resolve, reject) =>{
              /*
                Criar o modelo.
              */           
              this.model = tf.sequential();
              /*
                Criar layer de entrada com 7 imputs e 16 neurônios.
              */           
              this.model.add(tf.layers.dense({ units: 16, inputShape: 7, activation: 'tanh' }));
              /*
                Layer de saída com 1 neurônio.
              */           
              this.model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));           
              this.model.compile({ optimizer: 'sgd', loss: 'binaryCrossentropy', lr: 0.1 });
              
              const xs = tf.tensor2d(train.train);
              const ys = tf.tensor2d(train.merge);
              this.model.fit(xs, ys, {
                    epochs: 1000
                    ,callbacks: {
                      onEpochEnd: async (epoch, log) => {
                        if (epoch % 100 == 0) console.log(`Epoch ${epoch}: loss = ${log.loss}`);
                      }
                    }
              }).then((a,b) => {
                   console.log('confTensor');
                   let loss = a.history.loss[(a.params.epochs-1)]
                   resolve(loss)
              });
       })
    }
    async execTensor(test){
        //console.log('execTensor',test);
        if(test.length >= 7){
            const target = tf.tensor2d([test]); //[[ 0, 1, 2, 3, 4, 2, 1]]
            let ru = await this.model.predict(target); //.print();
            //console.log('ru.dataSync()',ru.dataSync());
            return ru.dataSync()[0];
        }else{
          console.log('incompleto:',test.length);
        }
    }

    async confPredictTensor(){
        this.modelPredict = tf.sequential();
        this.modelPredict.add(tf.layers.dense({units: 1, inputShape: [1]}));
        this.modelPredict.compile({loss: 'meanSquaredError', optimizer: 'sgd'});
    }
    async execPredictTensor(doenca,data){
        //console.log('execPredictTensor',data);
        let scores = [];
        let index  = [];
        let letCopy = {};
        let count = 0;
        //data.reverse();
        for(let i in data){
          console.log(data[i].score.item,data[i].data);
          if(i >= (data.length -8)){
            count++;
            console.log('Predict------------',data[i].score.item,data[i].data);
            if(data[i].score.item != undefined){
               scores.push(parseFloat(Number(data[i].score.item).toFixed(3)));
               index.push(count);
            }
            letCopy = data[i];
          }
        }
        //console.log('letCopy',letCopy)
        if(letCopy.score.item != undefined){
          //inserir vaziu p/ criar ponto flutuante
           let datax = new Date(letCopy.data);
           let dataEndx = new Date(letCopy.dataEnd);
           datax.setDate(datax.getDate());
           dataEndx.setDate(dataEndx.getDate() + 7);
           let datatimex = new Date(datax).getTime();
           let datatimeEndx = new Date(dataEndx).getTime();
           letCopy = {'score':{'list':[1]},'doenca':doenca,'datatime':datatimex,'data':datax,'datatimeEnd':datatimeEndx,'dataEnd':dataEndx};
           data.push(letCopy);
        }
        console.log('execPredictTensor',scores,index);
        if(scores[0] != undefined){
            let xs = tf.tensor1d(index);
            let ys = tf.tensor1d(scores);

            this.modelPredict.fit(xs, ys, {
                  epochs: 250
                  /*,callbacks: {
                    onEpochEnd: async (epoch, log) => {
                      console.log(`Epoch ${epoch}: loss = ${log.loss}`);
                    }
                  }*/
            }).then(() => {
                 let last = letCopy;
                 //console.log('last',last);
                 let dataStart = last.dataEnd;
                 let datatime = new Date(dataStart).getTime();
                 let dataEnd = new Date(dataStart);
                 dataEnd.setDate(dataEnd.getDate() + 7);
                 let datatimeEnd = new Date(dataEnd).getTime();
                 console.log('predict',dataStart,dataEnd);

                 let ru = this.modelPredict.predict(tf.tensor2d([(scores.length)], [1, 1]));//.print();
                 console.log('predict',ru.dataSync()[0]);
                 let newItem = {'score':{'item':ru.dataSync()[0]}
                               ,'doenca':doenca
                               ,'data':dataStart
                               ,'dataEnd':dataEnd
                               ,'datatimeEnd':datatimeEnd
                               ,'datatime':datatime
                               };

                 data.push(newItem);
                 console.log('execPredictTensor',data.length);
                 this.MONGO.scores(doenca,data,this.SOCKET);
            });
        }
    }
    /*
       Recebe o chamado para iniciar o processo.
    */    
    async send(doenca){
         let result = [];
         await this.MONGO.group_by_day(doenca);
         let list = await this.MONGO.get_warms(doenca);
         /*
            Consolida os dados para executar a rede.
         */
         let data = this.mount_test(list);
         let fila = [];
        for(let j in data){
             if(j >= (data.length -8))
               fila.push(data[j]);
         }
         console.log('fila',fila.length);
         for(let i in fila){
            fila[i].score = {'item':0,'log':0};
            fila[i].score.log  = await this.confTensor(this.train);
            /*
                Executa a rede.
            */ 
            fila[i].score.item = await this.execTensor(fila[i].list);
            /*
                Adiciona o retorno da rede no log para o dashboard.
            */ 
            result.push(fila[i]);
         }
         console.log('result',result.length);
         /*
           Executa a predição do próximo ponto.
         */        
         await this.execPredictTensor(doenca,result);
    }
    mount_test(list){
      //com base nos warms monta o test
      let data  = [];
      let count = 1;
      let index = 0;
      let item  = [];
      for (let i in list){
          //console.log(list[i]);
          if(data[index] == undefined) data[index] = {'score':0,'list':[],'doenca':''};
          item.push(list[i].casos);
         if(count == 1){
            data[index].doenca   = list[i].doenca;
            data[index].datatime = list[i].datatime;
            data[index].data     = new Date(list[i].data);
         }
         //console.log(i,this.proc.length);
         if(count >= 7 || parseInt(i) == (list.length-1)){
            data[index].datatimeEnd = list[i].datatime;
            data[index].dataEnd = new Date(list[i].data);
            data[index].list = item;
            //
            index++;
            count = 0;
            item  = [];
         }
         count++;
      }
      return data;
    }

    dataTrain(scenes,days){
        let sum   = 0;
        let train = [];
        let item  = [];
        let reverse = [];
        let merge = [];
        for(let i=0; i<= scenes; i++){
            item = [];
            for(let j=sum; j<= (days+sum); j++){
               item[(j-sum)] = j;
            }
            train.push(item);
            reverse = [];
            for(let x in item){
              reverse[x] = item[x];
            }
            reverse.reverse();
            train.push(reverse);

            merge.push([1], [0]);//priemiro array positivo,segundo negativo
          sum++;
        }
        //console.log(merge);
        //console.log(train);
      return {'train':train,'merge':merge};
    }

    async exam(data){
         let result = [];
         for(let i in data){
             data[i].score = {'item':0};
             data[i].score.log  = await this.confTensor(this.train);
             data[i].score.item = await this.execTensor(data[i].list);
             console.log('exam',data[i].list,data[i].score);
             result.push(data[i]);
         }
         this.SOCKET.emit("exam", result);
    }
}

module.exports = oAPI;
