
import Docker from "dockerode";
import tar from "tar-stream";
import { PassThrough } from "node:stream";
import { performance } from "node:perf_hooks";

const docker = new Docker();

export default async function executePython(code) {
    let container;
    let statsStream;
    let logStream;

    let stdout = "";
    let stderr = "";

    let peakMemory = 0;
    let latestMemory = 0;
    let memoryLimit = 0;
    let cpuSamples = [];
    let timedOut = false;

    const TIME_LIMIT_MS = 5000;

    try {
        container = await docker.createContainer({
            Image: "rnt-python",
            Cmd: ["python", "-I", "/app/main.py"],
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            HostConfig: {
                Memory: 128 * 1024 * 1024,
                NanoCpus: 1_000_000_000,
                NetworkMode: "none",
                AutoRemove: false
            }
        });

        // Package submitted code
        const pack = tar.pack();
        pack.entry({ name: "main.py" }, code);
        pack.finalize();

        await container.putArchive(pack, { path: "/app" });

        // Attach to output before starting
        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();

        stdoutStream.on("data", chunk => {
            stdout += chunk.toString();
        });

        stderrStream.on("data", chunk => {
            stderr += chunk.toString();
        });

        logStream = await container.attach({
            stream: true,
            stdout: true,
            stderr: true
        });

        container.modem.demuxStream(
            logStream,
            stdoutStream,
            stderrStream
        );

        // Start collecting resource statistics
        statsStream = await container.stats({ stream: true });

        statsStream.on("data", chunk => {
            try {
                const stats = JSON.parse(chunk.toString());

                const memory = stats.memory_stats;
                if (memory) {
                    const usage = memory.usage || 0;
                    const cache =
                        memory.stats?.inactive_file ??
                        memory.stats?.cache ??
                        0;

                    const used = Math.max(0, usage - cache);

                    latestMemory = used;
                    peakMemory = Math.max(peakMemory, used);
                    memoryLimit = memory.limit || memoryLimit;
                }

                const cpu = stats.cpu_stats;
                const previous = stats.precpu_stats;

                if (cpu && previous) {
                    const cpuDelta =
                        cpu.cpu_usage.total_usage -
                        previous.cpu_usage.total_usage;

                    const systemDelta =
                        cpu.system_cpu_usage -
                        previous.system_cpu_usage;

                    const onlineCpus =
                        cpu.online_cpus ||
                        cpu.cpu_usage.percpu_usage?.length ||
                        1;

                    if (cpuDelta > 0 && systemDelta > 0) {
                        const percentage =
                            (cpuDelta / systemDelta) *
                            onlineCpus *
                            100;

                        cpuSamples.push(percentage);
                    }
                }
            } catch (error) {
                console.error("Stats parsing error:", error.message);
            }
        });

        const startTime = performance.now();

        await container.start();

        // Enforce a wall-clock execution timeout
        let timeout;
        const waitPromise = container.wait();

        const timeoutPromise = new Promise((_, reject) => {
            timeout = setTimeout(async () => {
                timedOut = true;
                await container.kill().catch(() => {});
                reject(new Error("Execution timed out"));
            }, TIME_LIMIT_MS);
        });

        let result;

        try {
            result = await Promise.race([
                waitPromise,
                timeoutPromise
            ]);
        } finally {
            clearTimeout(timeout);
        }

        const executionTime = performance.now() - startTime;

        // Allow pending output chunks to be processed
        await new Promise(resolve => setTimeout(resolve, 50));

        const averageCpu = cpuSamples.length
            ? cpuSamples.reduce((sum, value) => sum + value, 0) /
              cpuSamples.length
            : 0;

        return {
            status: result.StatusCode === 0 ? "ACCEPTED" : "RUNTIME_ERROR",
            exitCode: result.StatusCode,
            stdout,
            stderr,
            executionTimeMs: Number(executionTime.toFixed(2)),
            memory: {
                peakBytes: peakMemory,
                peakMB: Number((peakMemory / 1024 / 1024).toFixed(2)),
                lastSampleBytes: latestMemory,
                limitBytes: memoryLimit
            },
            cpu: {
                averagePercent: Number(averageCpu.toFixed(2)),
                samples: cpuSamples.length
            },
            timedOut
        };
    } catch (error) {
        if (timedOut) {
            return {
                status: "TIME_LIMIT_EXCEEDED",
                stdout,
                stderr,
                timedOut: true
            };
        }

        throw error;
    } finally {
        // Stop stats collection and remove container
        if (statsStream) {
            statsStream.destroy();
        }

        if (logStream) {
            logStream.destroy();
        }

        if (container) {
            await container.remove({ force: true }).catch(() => {});
        }
    }
}

