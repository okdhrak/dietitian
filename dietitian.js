const LINE_CHANNEL_ACCESS_TOKEN = 'P/1kDx8RI8KTNEU6EAY2PmLh0rWVTUVqNCeIMs05rbHwUJr25umCi98oGhBBYpY+zpY4XLwpuBPZIiL8Hs7PJf8uKL5OwpH/3SK3Xr2a2lKBRlqhhneEa7YFWxP5eLVNWv38AsQR7IAzkuhydZuCJgdB04t89/1O/w1cDnyilFU=';

var request = require('request');

module.exports = class dietitian {
    static replyRecommendation(replyToken){
      var headers = {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
      }
      var body = {
          replyToken: replyToken,
          messages: [{
              type: 'text',
              text: 'カレーライスでもどうですか？'
          }]
      }
      var url = 'https://api.line.me/v2/bot/message/reply';
      request({
          url: url,
          method: 'POST',
          headers: headers,
          body: body,
          json: true
      });
    }


    static replyTotalCalorie(replyToken, foodList){
        var totalCalorie = 0;
        for (var food of foodList){
            totalCalorie += food.calorie;
        }

        var headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
        }
        var body = {
            replyToken: replyToken,
            messages: [{
                type: 'text',
                text: 'カロリーは合計' + totalCalorie + 'kcalです！'
            }]
        }
        var url = 'https://api.line.me/v2/bot/message/reply';
        request({
            url: url,
            method: 'POST',
            headers: headers,
            body: body,
            json: true
        });
    }

    static askWhichFood(replyToken, foodList){
        var headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
        }
        var body = {
            replyToken: replyToken,
            messages: [{
                type: 'template',
                altText: 'どの食品が最も近いですか？',
                template: {
                    type: 'buttons',
                    text: 'どの食品が最も近いですか？',
                    actions: []
                }
            }]
        }

        // Templateメッセージのactionsに確認すべき食品を追加。
        for (var food of foodList){
            body.messages[0].template.actions.push({
                type: 'postback',
                label: food.food_name,
                data: JSON.stringify(food)
            });

            // 現在Templateメッセージに付加できるactionは4つまでのため、5つ以上の候補はカット。
            if (body.messages[0].template.actions.length == 4){
                break;
            }
        }

        var url = 'https://api.line.me/v2/bot/message/reply';
        request({
            url: url,
            method: 'POST',
            headers: headers,
            body: body,
            json: true
        });
    }
}
