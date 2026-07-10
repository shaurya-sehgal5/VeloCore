const deploymentQueryService = require("../services/deployment/deployment-query.service");

exports.getServices = async (req, res) => {

    try {

        const services = await deploymentQueryService.getServices(

            req.params.deploymentId

        );

        res.json(services);

    }

    catch (error) {

        res.status(500).json({

            error: error.message

        });

    }

};