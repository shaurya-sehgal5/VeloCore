const fs = require("fs");
const yaml = require("js-yaml");

class ComposeParser {

    parse(file) {

        const compose = yaml.load(
            fs.readFileSync(file, "utf8")
        );

        return compose.services || {};

    }

}

module.exports = new ComposeParser();