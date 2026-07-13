const kubernetesService = require("./services/kubernetes/kubernetes.service");

(async () => {
  const file = await kubernetesService.generate({
    projectName: "test-app",
    imageName: "nginx:latest",
    containerPort: 80,
  });

  console.log("Generated:", file);
})();