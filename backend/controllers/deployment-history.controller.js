const service =  require("../services/deployment/deployment-history.service");

exports.list = async (req, res) => {
    try {

        const history = await service.list(
            req.params.deploymentId
        );

        res.json(history);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message,
        });

    }
};