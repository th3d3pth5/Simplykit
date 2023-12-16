const axios = require('axios');
const fs = require('fs');
var http = require('http');

const { parse } = require('path');

var memberList, spFront, latestStamp;
const fieldMappings = {
    'name': 'name',
    'desc': 'desc',
    'color': 'color',
    'pronouns': 'pronouns',
    'avatar_url': 'avatarUrl',
    'description': 'desc'
};
setup();


const server = http.createServer((request, response) => {
    var userAgent = request.headers['user-agent'];
    if (userAgent && userAgent.includes('UptimeRobot')) {
        response.writeHead(200);
        response.end();
    } else {
        const {method} = request;
        if (method === 'GET'){response.end();} else
        if (method === 'POST'){
            let requestData = '';
            request.on('data', (chunk) => {requestData += chunk;});
            request.on('end', () => {
                const parsedData = JSON.parse(requestData);
                if (parsedData.type === 'CREATE_MESSAGE') { } else
                if (parsedData.type === 'CREATE_MEMBER') createMember(parsedData); else
                if (parsedData.type === 'DELETE_MEMBER') deleteMember(parsedData); else
                if (parsedData.type === 'UPDATE_MEMBER') updateMember(parsedData); else
                if (parsedData.type === 'CREATE_SWITCH') createSwitch(parsedData); else
                if (parsedData.type === 'UPDATE_SWITCH') updateSwitch(parsedData);
            });
        }
    }
});

function updateSwitch(parsedData){
  if (parsedData.data.timestamp) {
    spFront.sort((a, b) => b.startTime - a.startTime);
    if (parsedData.data.timestamp < latestStamp){
      for (var item in spFront) {
        if (spFront[item].timestamp < parsedData.data.timestamp)
          spFront[item].timestamp = parsedData.data.timestamp;
          let data = JSON.stringify({ "custom": false, "live": false, "startTime": spFront[item].startTime,
          "member": spFront[item].member});
          let config = {
            method: 'patch', maxBodyLength: Infinity,
            url: `https://api.apparyllis.com:8443/v1/frontHistory/${spFront[item].switchId}`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': SP_TOKEN
            }, data: data
          };
          axios(config).then((response) => { }).catch((error) => { console.log(error); });
      }
    }
    else if (parsedData.data.timestamp > latestStamp){
      for (var item in spFront) {
        if (spFront[item].timestamp === latestStamp)
          spFront[item].timestamp = parsedData.data.timestamp;
      }
    }
  }
}
function createSwitch(parsedData){
  console.log('making switch');
    var stamp = parsedData.data.timestamp;
    var tempList = parsedData.data.members;
    for (var item in spFront) {
        const switchId = spFront[item].switchId;
        const spId = spFront[item].member;
        const index = memberList.findIndex(item => item.spUid === spId);
        const pkId = memberList[index].pkUuid;
        if (tempList.includes(pkId)) { tempList = tempList.filter(item => item != pkId);  console.log('member already fronting');}
        else {
            let data = JSON.stringify({ "custom": false, "live": false, "startTime": spFront[item].startTime,
            "endTime": getTimeStamp(stamp), "member": spId
              });
              let config = {
                method: 'patch', maxBodyLength: Infinity,
                url: `https://api.apparyllis.com:8443/v1/frontHistory/${switchId}`,
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': SP_TOKEN
                }, data: data
              };
              axios(config).then((response) => { }).catch((error) => { console.log(error); });
        }        
    }
    for (var item in tempList) {
      console.log('going through member');
        const pkId = tempList[item];
        const index = memberList.findIndex(item => item.pkUuid === pkId);
        const spId = memberList[index].spUid;
        let jsonData = {
            "custom": false, "live": true,
            "startTime": getTimeStamp(stamp), "member": spId
          };
          let data = JSON.stringify(jsonData);
          let config = {
            method: 'post', maxBodyLength: Infinity,
            url: `https://api.apparyllis.com:8443/v1/frontHistory`,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': SP_TOKEN
            }, data: data
          };
          var addToFront;
          addToFront = {
            "custom": true, "live": true, "startTime": getTimeStamp(stamp),
            "member": spId, "endTime": null
          };
      console.log('adding member');
          axios(config).then((response) => { }).catch((error) => {
            if (error.data === 'This member is already set to be fronting. Remove them from front prior to adding them to front') {
              let data = JSON.stringify({ "live": false, "startTime": spFront[item].startTime,
                                         "endTime": getTimeStamp(stamp), "member": spId });
              let config = {
                method: 'patch', maxBodyLength: Infinity,
                url: `https://api.apparyllis.com:8443/v1/frontHistory/${switchId}`,
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': SP_TOKEN
                }, data: data
              };
              axios(config).then((response) => { }).catch((error) => {});
            }
          });
    }
}
function createMember(parsedData){
    const pkUuid = parsedData.id;

    axios.get(`https://api.pluralkit.me/v2/members/${pkUuid}`).then((response) => {
        const pkId = response.data.id;
        let data = JSON.stringify({
            "name": parsedData.data.name,
            "desc": "",
            "color": "",
            "pronouns": "",
            "pkId": response.data.id,
            "avatarUrl": "",
            "private": false,
            "preventTrusted": false,
            "supportDescMarkdown": true,
            "preventsFrontNotifs": false,
            "info": {
              "*": "string"
            }
        });
        let config = {
            method: 'post',
                  maxBodyLength: Infinity,
                  url: 'https://api.apparyllis.com:8443/v1/member/',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': SP_TOKEN
                  },
                  data: data
        }
        axios(config).then((response) => {
            const newMember = {
                "pkId": pkId,
                "pkUuid": pkUuid,
                "spUid": response.data
            };
            memberList.push(newMember);
            const updatedData = JSON.stringify(memberList, null, 2);
            fs.writeFile('members.json', updatedData, 'utf8', writeError => { });
        });
    });
}
function deleteMember(parsedData){
    const pkUuid = parsedData.id;
    const index = memberList.findIndex(item => item.pkUuid === pkUuid);
    const spId = memberList[index].spUid;
    memberList.splice(index,1);
    const updatedData = JSON.stringify(memberList, null, 2);
    fs.writeFile('members.json', updatedData, 'utf8', writeError => { });
    let config = {
        method: 'delete',
        maxBodyLength: Infinity,
        url: `https://api.apparyllis.com:8443/v1/member/${spId}`,
        headers: { 'Authorization': SP_TOKEN }
    };
    axios(config).then((response) => { });
}
function updateMember(parsedData){
    const fieldName = Object.keys(parsedData.data)[0];
    const pkUuid = parsedData.id;
    const index = memberList.findIndex(item => item.pkUuid === pkUuid);
    const spId = memberList[index].spUid;
    let config = {
        method: 'get', maxBodyLength: Infinity, url:
          `https://api.apparyllis.com:8443/v1/member/${SYS_ID}/${spId}`,
        headers: { 'Authorization': SP_TOKEN }
      };
    axios(config).then((response) => {
        const mappedField = fieldMappings[fieldName];
        response.data.content[mappedField] = parsedData.data[fieldName];
        delete response.data.content.uid;
        delete response.data.content.lastOperationTime;
        const updatedData = JSON.stringify(response.data.content);
        let config = {
        method: 'patch', maxBodyLength: Infinity, url: `https://api.apparyllis.com:8443/v1/member/${spId}`,
        headers: { 'Content-Type': 'application/json', 'Authorization': SP_TOKEN }, data: updatedData };
        axios(config).then((response) => { });
    });
}
function setup(){
    fs.readFile('front.json', 'utf8', (err, fileData) => {
        spFront = JSON.parse(fileData);
        const valuesArray = spFront.map(obj => obj.startTime);
        const smallestValue = valuesArray.reduce((min, current) => {
          latestStamp = current < min ? current : min;
        }, valuesArray[0]);
    });
    fs.readFile('members.json', 'utf8', (err, fileData) => {
        memberList = JSON.parse(fileData);
    });
}
function getTimeStamp(stamp) {
    const date = stamp.split('T')[0];
    const time = stamp.split('T')[1];
    const year = date.split('-')[0];
    const month = parseInt(date.split('-')[1], 10) - 1;
    const day = date.split('-')[2];
    const hour = time.split(':')[0];
    const min = time.split(':')[1];
    const sec = time.split(':')[2].split('.')[0];
    const mil = time.split('.')[1].split('Z')[0].slice(0, 3);
    return Date.UTC(year, month, day, hour, min, sec, mil);
  }

server.listen(3000, () => {
  console.log('Server is running on port 3000.');
});