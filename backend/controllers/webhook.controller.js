const githubWebhook = async (req, res) => {
    try {

        const payload = JSON.parse(req.body.toString());

        const repository = payload.repository.full_name;
        const branch = payload.ref.replace("refs/heads/", "");
        const commit = payload.after;
        const cloneUrl = payload.repository.clone_url;
        const pusher = payload.pusher.name;

    
        console.log({
            repository,
            branch,
            commit,
            cloneUrl,
            pusher
        });

        return res.status(200).json({
            success: true,
            message: "Deployment received"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Webhook failed"
        });

    }
};

module.exports = {
    githubWebhook
};