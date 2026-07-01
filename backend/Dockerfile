# Use a lightweight, secure Node.js alpine base image
FROM node:20-alpine

# Set up a secure workspace directory inside the container
WORKDIR /app

# Install standard build prerequisites (Git is required to pull submodules if needed)
RUN apk add --no-cache git

# Copy an automation entrypoint script that handles independent framework builds dynamically
COPY builder.sh /usr/local/bin/builder.sh
RUN chmod +x /usr/local/bin/builder.sh

# Set the entrypoint script to execute instantly when the container wakes up
ENTRYPOINT ["/usr/local/bin/builder.sh"]