// -----------------------------------------------------------------------------
// 定数の設定
//const LINE_CHANNEL_ACCESS_TOKEN = 'P/1kDx8RI8KTNEU6EAY2PmLh0rWVTUVqNCeIMs05rbHwUJr25umCi98oGhBBYpY+zpY4XLwpuBPZIiL8Hs7PJf8uKL5OwpH/3SK3Xr2a2lKBRlqhhneEa7YFWxP5eLVNWv38AsQR7IAzkuhydZuCJgdB04t89/1O/w1cDnyilFU='; // 追加

const APIAI_CLIENT_ACCESS_TOKEN = '71b095e7757b4450aef8f853de968415';

// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// モジュールのインポート
var express = require('express');
var bodyParser = require('body-parser'); // 追加
var request = require('request'); // 追加
var mecab = require('mecabaas-client'); // 追加
var shokuhin = require('shokuhin-db'); // 追加
var memory = require('memory-cache'); // 追加

var apiai = require('apiai'); // 追加
var uuid = require('node-uuid'); // 追加
var Promise = require('bluebird'); // 追加

var dietitian = require('./dietitian'); // 追加
var app = express();

// -----------------------------------------------------------------------------
// ミドルウェア設定
app.use(bodyParser.json()); // 追加

// 追加：Promiseチェーンのキャンセルを有効にします。
Promise.config({
    cancellation: true
});


// -----------------------------------------------------------------------------
// Webサーバー設定
var port = (process.env.PORT || 3000);
var server = app.listen(port, function() {
    console.log('Node is running on port ' + port);
});

// -----------------------------------------------------------------------------
// ルーター設定
app.get('/', function(req, res, next){
    res.send('Node is running on port ' + port);
});

// webhook
// LINEからのリクエストに対するレスポンス
/*app.post('/webhook', function(req, res, next){
    res.status(200).end();
    for (var event of req.body.events){
        if (event.type == 'message'){
            console.log(event.message);
        }
    }
});*/

/*app.post('/webhook', function(req, res, next){
    res.status(200).end();
    for (var event of req.body.events){
        if (event.type == 'message' && event.message.text == 'ハロー'){
            var headers = {//①
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
            }
            var body = {//②
                replyToken: event.replyToken,
                messages: [{
                    type: 'text',
                    text: 'しばくぞ！'
                }]
            }
            var url = 'https://api.line.me/v2/bot/message/reply';//③
            request({//④
                url: url,
                method: 'POST',
                headers: headers,
                body: body,
                json: true
            });
        }
    }
});*/

/*app.post('/webhook', function(req, res, next){
    res.status(200).end();
    for (var event of req.body.events){
        if (event.type == 'message' && event.message.text){
             // Mecabクラウドサービスでメッセージを解析
            mecab.parse(event.message.text)
            .then(
                function(response){
                      // 解析結果を出力
                    console.log(response);
                }
            );

        }
    }
});*/

/*app.post('/webhook', function(req, res, next){
    res.status(200).end();
    for (var event of req.body.events){
        if (event.type == 'message' && event.message.text){
            mecab.parse(event.message.text)
            .then(
                function(response){
                    var foodList = [];
                    for (var elem of response){
                        if (elem.length > 2 && elem[1] == '名詞'){
                            foodList.push(elem);
                        }
                    }
                    var gotAllNutrition = [];
                    if (foodList.length > 0){
                        for (var food of foodList){
                            gotAllNutrition.push(shokuhin.getNutrition(food[0]));
                        }
                        return Promise.all(gotAllNutrition);
                    }
                }
            ).then(
                function(response){
                    console.log(response);
                }
            );
        }
    }
});*/

app.post('/webhook', function(req, res, next){
    res.status(200).end();
    for (var event of req.body.events){
        if (event.type == 'message' && event.message.text){

            /*
             * api.aiでメッセージを処理。レスポンスとしてgotIntentというPromiseを返すように実装。
             */
            var aiInstance = apiai(APIAI_CLIENT_ACCESS_TOKEN);
            var aiRequest = aiInstance.textRequest(event.message.text, {sessionId: uuid.v1()});
            var gotIntent = new Promise(function(resolve, reject){
                aiRequest.on('response', function(response){
                    resolve(response);
                });
                aiRequest.end();
            });

            /*
             * api.aiからレスポンスが帰ってきたらこの処理を開始。
             */
            var main = gotIntent.then(
                function(response){
                    console.log(response.result.action);
                    switch (response.result.action) {
                        case 'recommendation':
                            // 意図は「お薦めの食事」だと特定。お薦めの食事を回答します。
                            dietitian.replyRecommendation(event.replyToken);

                            // ここで処理は終了
                            main.cancel();
                            break;
                        default:
                            // 意図が特定されなかった場合は食事の報告だと仮定して形態素解析処理へ移る。
                            return mecab.parse(event.message.text);
                            break;
                    }
                }
            ).then(
                function(response){
                    var foodList = [];
                    for (var elem of response){
                        if (elem.length > 2 && elem[1] == '名詞'){
                            foodList.push(elem);
                        }
                    }
                    var gotAllNutrition = [];
                    if (foodList.length > 0){
                        for (var food of foodList){
                            gotAllNutrition.push(shokuhin.getNutrition(food[0]));
                        }
                        return Promise.all(gotAllNutrition);
                    }
                }
            ).then(
                function(responseList){
                    var botMemory = {
                        confirmedFoodList: [],
                        toConfirmFoodList: [],
                        confirmingFood: null
                    }
                    for (var nutritionList of responseList){
                        if (nutritionList.length == 0){
                            // 少なくとも今回の食品DBでは食品と判断されなかったのでスキップ。
                            continue;
                        } else if (nutritionList.length == 1){
                            // 該当する食品が一つだけ見つかったのでこれで確定した食品リストに入れる。
                            botMemory.confirmedFoodList.push(nutritionList[0]);
                        } else if (nutritionList.length > 1){
                            // 複数の該当食品が見つかったのでユーザーに確認するリストに入れる。
                            botMemory.toConfirmFoodList.push(nutritionList);
                        }
                    }

                    /*
                     * もし確認事項がなければ、合計カロリーを返信して終了。
                     * もし確認すべき食品があれば、質問して現在までの状態を記憶に保存。
                     */
                    if (botMemory.toConfirmFoodList.length == 0 && botMemory.confirmedFoodList.length > 0){
                        // 確認事項はないので、確定した食品のカロリーの合計を返信して終了。
                        dietitian.replyTotalCalorie(event.replyToken, botMemory.confirmedFoodList);
                    } else if (botMemory.toConfirmFoodList.length > 0){
                        // どの食品が正しいか確認する。
                        dietitian.askWhichFood(event.replyToken, botMemory.toConfirmFoodList[0]);

                        // 質問した食品は確認中のリストに入れ、質問リストからは削除。
                        botMemory.confirmingFood = botMemory.toConfirmFoodList[0];
                        botMemory.toConfirmFoodList.splice(0, 1);

                        // Botの記憶に保存
                        memory.put(event.source.userId, botMemory);
                    }
                }
            );
        } else if (event.type == 'postback'){
            // リクエストからデータを抽出。
            var answeredFood = JSON.parse(event.postback.data);

            // 記憶を取り出す。
            var botMemory = memory.get(event.source.userId);

            // 回答された食品を確定リストに追加
            botMemory.confirmedFoodList.push(answeredFood);

            /*
             * もし確認事項がなければ、合計カロリーを返信して終了。
             * もし確認すべき食品があれば、質問して現在までの状態を記憶に保存。
             */
            if (botMemory.toConfirmFoodList.length == 0 && botMemory.confirmedFoodList.length > 0){
                // 確認事項はないので、確定した食品のカロリーの合計を返信して終了。
                dietitian.replyTotalCalorie(event.replyToken, botMemory.confirmedFoodList);
            } else if (botMemory.toConfirmFoodList.length > 0){
                // どの食品が正しいか確認する。
                dietitian.askWhichFood(event.replyToken, botMemory.toConfirmFoodList[0]);

                // 質問した食品は確認中のリストに入れ、質問リストからは削除。
                botMemory.confirmingFood = botMemory.toConfirmFoodList[0];
                botMemory.toConfirmFoodList.splice(0, 1);

                // Botの記憶に保存
                memory.put(event.source.userId, botMemory);
            }
        }
    }
});
