const fs = require('fs');
const WebSocketClient = require('websocket').client;
const {EmbedBuilder, WebhookClient} = require('discord.js');
var spFront;
setup();

var client = new WebSocketClient();
var auth = JSON.stringify({'op':'authenticate', 'token': SP_TOKEN});

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('Websocket Client Connected');
    connection.send(auth);
    setInterval(function() {
        if (connection.connected) connection.ping();
    }, 9000);

    connection.on('error', function(error) {
        console.log('Connection Error: ' + error.toString());
    });

    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
        client.connect('wss://api.apparyllis.com/v1/socket', 'echo-protocol');
    });

    connection.on('message', function(message){
        const parsed = JSON.parse(message.utf8Data);

        if (parsed.msg === 'notification') sendNotif(parsed);
        else if (parsed.msg === 'update' && parsed.target === 'frontHistory') frontJsonUpdate(parsed);

        if (message.type === 'utf8') {
            console.log("Received: "+ message.utf8Data);
            console.log();
        }
    });
});

function sendNotif(parsed){
    var memList = parsed.message;
    memList = memList.split('Fronting: ')[1];
    const embed = new EmbedBuilder().setTitle('Fronters').setDescription(memList).setColor(0xffffff);
    var sysName = parsed.title;
    
    const discClient = new WebhookClient({id:DISC_ID,token:'DISC_TOKEN'});
    discClient.send({
        content: `Hey! New front update from ${sysName}! You should check those out.`,
        username: "SP Notification!",
        avatarUrl: "",
        embeds: [embed]
    });
}
function frontJsonUpdate(parsed){
    if (parsed.results[0].operationType === 'insert' && parsed.results[0].content.live === true){
        const newFront = parsed.results[0].content;
        delete newFront.uid;
        delete newFront.lastOperationTime;
        newFront.switchId = parsed.results[0].id;
        spFront.push(newFront);
        const updatedData = JSON.stringify(spFront, null, 2);
        fs.writeFileSync('front.json', updatedData, 'utf8', (writeErr) => {console.log("Couldn't write to front.json");});
    } else if (parsed.results[0].operationType === 'update' && parsed.results[0].content.live === false){
        const index = spFront.findIndex(item => item.member === parsed.results[0].content.member);
        if (index !== -1) spFront.splice(index, 1);
        const updatedData = JSON.stringify(spFront, null, 2);
        fs.writeFileSync('front.json', updatedData, 'utf8', (writeErr) => {console.log("Couldn't write to front.json");});
    }

}
function setup(){
    fs.readFile('front.json', 'utf8', (err, fileData) => {
        spFront = JSON.parse(fileData);
    });
}

client.connect('wss://api.apparyllis.com/v1/socket', 'echo-protocol');