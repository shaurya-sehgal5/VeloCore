const envService = require("../services/env.service");

class EnvController {

    async get(req, res) {

        try {

            const { deploymentId } = req.params;

            const env = await envService.get(deploymentId);

            return res.json(env);

        }

        catch (error) {

            return res.status(500).json({
                error: error.message
            });

        }

    }

    async save(req, res) {

        try {

            const { deploymentId } = req.params;

            const env = req.body;

            await envService.save(
                deploymentId,
                env
            );

            return res.json({
                success: true
            });

        }

        catch (error) {

            return res.status(500).json({
                error: error.message
            });

        }

    }

}

module.exports = new EnvController();