import Docker from "dockerode";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tar from "tar-fs";

const docker = new Docker();

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "images"
);

const images = {
  python: {
    name: "runt-python",
    dockerfile: path.join(root, "python", "Dockerfile"),
    context: path.join(root, "python"),
    command: ["python", "-I", "/app/main.py"],
  },

  cpp: {
    name: "runt-cpp",
    dockerfile: path.join(root, "cpp", "Dockerfile"),
    context: path.join(root, "cpp"),
    command: [
      "sh",
      "-c",
      "g++ -std=c++17 -O2 -o /tmp/main /app/main.cpp && /tmp/main",
    ],
  },

  java: {
    name: "runt-java",
    dockerfile: path.join(root, "java", "Dockerfile"),
    context: path.join(root, "java"),
    command: ["sh", "-c", "javac -d /tmp /app/Main.java && java -cp /tmp Main"],
  },

  javascript: {
    name: "runt-javascript",
    dockerfile: path.join(root, "javascript", "Dockerfile"),
    context: path.join(root, "javascript"),
    command: ["node", "/app/main.js"],
  },
};

export default async function ensureImageBuild(config) {
  if (!config?.name || !config?.context) {
    throw new Error("Invalid image configuration");
  }

  const image = docker.getImage(config.name);

  // Check whether the image already exists
  try {
    await image.inspect();
    console.log(`${config.name} already exists`);
    return;
  } catch (error) {
    if (error.statusCode !== 404) {
      throw error;
    }
  }

  console.log(`Building ${config.name}`);

  // Create a tar stream from the build context
  const contextStream = tar.pack(config.context);

  // Build the Docker image
  const stream = await docker.buildImage(contextStream, {
    t: config.name,
    dockerfile: "Dockerfile",
  });

  // Track build progress and errors
  await new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (error, output) => {
        if (error) {
          return reject(error);
        }

        const failure = output?.find((item) => item.error || item.errorDetail);

        if (failure) {
          return reject(
            new Error(
              failure.error ||
                failure.errorDetail?.message ||
                "Docker image build failed"
            )
          );
        }

        resolve(output);
      },
      (event) => {
        if (event.stream) {
          process.stdout.write(event.stream);
        }
      }
    );
  });

  console.log(`${config.name} built successfully`);
}

export { images };
