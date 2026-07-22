const client=require("./prometheus.service");

const securityInfo=new client.Gauge({

name:"velocore_security_info",

help:"Security metadata",

labelNames:[
"deployment",
"digest",
"scanTime"
]

});

const vulnerabilities=new client.Gauge({

name:"velocore_security_vulnerabilities",

help:"Image vulnerabilities",

labelNames:[
"deployment",
"severity"
]

});

module.exports={
securityInfo,
vulnerabilities
};