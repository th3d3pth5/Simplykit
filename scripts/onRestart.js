const fs = require('fs');
const axios = require('axios');

var config = {
  method: 'get',
maxBodyLength: Infinity,
  url: 'https://api.apparyllis.com/v1/members/${SYS_ID}',
  headers: { 
    'Authorization': SP_TOKEN
  }
};
axios(config)
.then((response) => {
  const spMembers = response.data;
}).catch((error) => { console.log(error); });
// get all SP members

var config = {
  method: 'get',
maxBodyLength: Infinity,
  url: 'https://api.pluralkit.me/v2/systems/yvrwx/members',
  headers: { 
    'Authorization': PK_TOKEN
  }
};
axios(config)
.then((response) => {
  const pkMembers = response.data;
}).catch((error) => { console.log(error); });
//get all PK members

spMembers = spMembers.map(obj => {
  obj.pkId = obj.content.pkId;
  obj.pkUuid = pkMembers.find(item => item.id == obj.pkId).uuid;
  obj.spUid = obj.id;

  delete obj.exists;
  delete obj.id;
  delete obj.content;

  return obj;
});

fs.writeFileSync('./data/members.json', JSON.stringify(spMembers));