const client=require("./prometheus.service");

const buildInfo=new client.Gauge({

name:"velocore_build_info",

help:"Build metadata",

labelNames:[

"deployment",

"framework",

"branch",

"commit",

"image",

"status"

]

});

const buildImageSize=new client.Gauge({

name:"velocore_build_image_size_bytes",

help:"Image size",

labelNames:["deployment"]

});

const buildDurationGauge=new client.Gauge({

name:"velocore_build_duration",

help:"Latest build duration",

labelNames:["deployment"]

});

module.exports={

buildInfo,

buildImageSize,

buildDurationGauge

};