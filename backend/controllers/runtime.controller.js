const runtimeQueryService = require("../services/runtime-query.service");

exports.list = async (req, res) => {

    try {

        const services = await runtimeQueryService.getByDeployment(

            req.params.deploymentId

        );

        res.json({

            deploymentId: req.params.deploymentId,

            services

        });

    }

    catch (error) {

        res.status(500).json({

            error: error.message

        });

    }

};