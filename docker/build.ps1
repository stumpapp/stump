# Set default values for arguments if they are not provided
$FORMAT = if ($args[0]) { $args[0] } else { "auto" }
$PLATFORMS = if ($args[1]) { $args[1] } else { "linux/amd64" }
$TAG = if ($args[2]) { $args[2] } else { "nightly" }
$RUN_PRISMA_GENERATE = if ($args[3]) { $args[3] } else { "false" }

# Get the current Git revision
$GIT_REV = git rev-parse --short HEAD

# Build the Docker image
docker buildx build `
    -f ./docker/Dockerfile `
    --load `
    --progress=$FORMAT `
    --platform=$PLATFORMS `
    -t aaronleopold/stump:$TAG `
    --build-arg GIT_REV=$GIT_REV `
    --build-arg RUN_PRISMA_GENERATE=$RUN_PRISMA_GENERATE .
