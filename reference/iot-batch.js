import { BatchServiceClient } from "@azure/batch";
import { ClientSecretCredential } from "@azure/identity";
import dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config({ path: '../.env', override: true });

/**
 * Batch commandLine에서 쉘 문법(세미콜론/파이프/여러 줄 등)을 안정적으로 쓰기 위해
 * /bin/bash -c "..."로 감싸는 패턴을 사용합니다.
 */
function bash(cmd) {
    const escaped = cmd.replace(/"/g, '\\"');
    return `/bin/bash -c "${escaped}"`;
}

async function main() {
    // ====== Batch 계정 정보 ======
    const batchAccountName = process.env.BATCH_ACCOUNT_NAME;
    const batchEndpoint    = process.env.BATCH_ENDPOINT; // https://<account>.<region>.batch.azure.com

    if (!batchAccountName || !batchEndpoint) {
        throw new Error("Missing required environment variables: BATCH_ACCOUNT_NAME or BATCH_ENDPOINT");
    }

    // ====== IDs ======
    const poolId = process.env.POOL_ID || "pool1";
    const jobId  = process.env.JOB_ID  || "job-run-iotclients";
    const taskId = process.env.TASK_ID || "task-run-iotclients-3-instances";

    // ====== Blob mount (BlobFuse) ======
    const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
    const containerName      = process.env.BLOB_CONTAINER_NAME;
    const sasKey             = process.env.BLOB_SAS_TOKEN; // 컨테이너 SAS (읽기 권한 필요)
    const accountKey         = process.env.BLOB_ACCOUNT_KEY; // 계정 키 방식도 지원, SAS와 혼용은 안됨

    if (!storageAccountName || !containerName || (!sasKey && !accountKey)) {
        throw new Error("Missing required environment variables: STORAGE_ACCOUNT_NAME, BLOB_CONTAINER_NAME, or BLOB_SAS_TOKEN/BLOB_ACCOUNT_KEY");
    }
    const relativeMountPath  = process.env.RELATIVE_MOUNT_PATH || "blobmnt";

    // ======= AAD(Service Principal) 인증 (필수) ======
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    // ====== Ubuntu 24.04 이미지/노드 에이전트 ======
    // Ubuntu 24.04 이미지 레퍼런스는 Canonical ubuntu-24_04-lts / server / latest 형태로 사용됩니다.
    const imageReference = {
    publisher: "Canonical",
    offer: "ubuntu-24_04-lts",
    sku: "server",
    version: "latest",
    };

    const nodeAgentSKUId = "batch.node.ubuntu 24.04";

    const vmSize = process.env.VM_SIZE || "Standard_D2s_v3";
    const targetDedicatedNodes = Number(process.env.TARGET_NODES || "3");

    const subnetId = "/subscriptions/76c02bb2-b0e6-4a2b-afea-2a9d59d5c05b/resourceGroups/rg-iotclient-simulator/providers/Microsoft.Network/virtualNetworks/iotclient-simulator-vnet/subnets/Azurebatch-iotclient-subnet";

    // ====== Batch client (AAD Service Principal only)
    if (!tenantId || !clientId || !clientSecret) {
        throw new Error("Missing AZURE_TENANT_ID, AZURE_CLIENT_ID, or AZURE_CLIENT_SECRET for AAD authentication");
    }

    class BatchTokenCredentials {
        constructor(credential) {
            this.credential = credential;
            this.scope = "https://batch.core.windows.net/.default";
        }
        async signRequest(webResource) {
            const token = await this.credential.getToken(this.scope);
            if (!token || !token.token) {
                throw new Error("Failed to acquire AAD token for Azure Batch");
            }
            webResource.headers.set("Authorization", `Bearer ${token.token}`);
            return webResource;
        }
    }

    const aadCred = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const creds = new BatchTokenCredentials(aadCred);
    const batchClient = new BatchServiceClient(creds, batchEndpoint);

    // ====== StartTask: Java 21 설치 ======
    // Ubuntu 24에서 apt로 OpenJDK 설치. 설치 위해 admin 권한이 일반적입니다.
    const startTaskCmd = bash([
    "set -euxo pipefail",
    "apt-get update",
    "apt-get install -y openjdk-21-jre-headless",
    "java --version",
    ].join("; "));

    // ====== Pool 생성: mountConfiguration(AzureBlobFileSystemConfiguration) + StartTask ======
    // BlobFuse 마운트는 accountKey / sasKey / identityReference 중 하나만 지정합니다.
    // 마운트는 AZ_BATCH_NODE_MOUNTS_DIR 하위(relativeMountPath)로 붙습니다.
    const maxTasksPerNode = 8; // 노드당 최대 task 수 (Blob 마운트 안정성 위해 권장: 1~10 사이)

    const poolConfig = {
    id: poolId,
    vmSize: vmSize,
    virtualMachineConfiguration: {
        imageReference,
        nodeAgentSKUId: nodeAgentSKUId,
    },
    targetDedicatedNodes: targetDedicatedNodes,
    enableAutoScale: false,
    maxTasksPerNode: maxTasksPerNode, // 노드당 동시 task 상한
    taskSlotsPerNode: maxTasksPerNode, // 슬롯 기반 스케줄러에서도 병렬 슬롯 확보
    targetLowPriorityNodes: 1,
    targetNodeCommunicationMode: "simplified",
    networkConfiguration: {
        subnetId: subnetId,
    },
    taskSchedulingPolicy: {
        nodeFillType: "Pack",
    },
    startTask: {
        commandLine: startTaskCmd,
        waitForSuccess: true,
        userIdentity: {
        autoUser: { elevationLevel: "admin", scope: "pool" }, // apt 설치 목적
        },
    },

    mountConfiguration: [
        {
        azureBlobFileSystemConfiguration: {
            accountName: storageAccountName,
            containerName: containerName,
            accountKey: accountKey,
            // sasKey: sasKey, 
            relativeMountPath: relativeMountPath,
            blobfuseOptions: "-o attr_timeout=240 -o entry_timeout=240 -o negative_timeout=120 -o allow_other", // 성능 개선을 위한 blobfuse 옵션 예시
        },
        },
    ],
    };
    // ====== pool 생성 ======
    console.log("Creating pool:", poolId);
    // await batchClient.pool.add(poolConfig);

    // ====== Job 생성 ======
    console.log("Creating job:", jobId);
    await batchClient.job.add({
    id: jobId,
    poolInfo: { poolId },
    });

    // ====== Task: 마운트된 경로의 target/iot.jar 실행 ======
    // 마운트된 위치는 AZ_BATCH_NODE_MOUNTS_DIR/<relativeMountPath> 로 접근. Ubuntu에서는 /mnt/batch/tasks/fsmounts에 매핑되는 경우가 많음.
    const jarPath = `$AZ_BATCH_NODE_MOUNTS_DIR/${relativeMountPath}/iot-device-java21-1.0-SNAPSHOT.jar`;

    const taskCmd = bash([
    'set -euxo pipefail',
    'echo AZ_BATCH_NODE_MOUNTS_DIR=$AZ_BATCH_NODE_MOUNTS_DIR',
    `echo "JAR=${jarPath}"`,
    `ls -al "$AZ_BATCH_NODE_MOUNTS_DIR/${relativeMountPath}"`,
    `nohup java -jar "${jarPath}" &`,
    `nohup java -jar "${jarPath}" &`,
    // `nohup java -jar "${jarPath}" > "$AZ_BATCH_NODE_MOUNTS_DIR/${relativeMountPath}/iot-1.log" 2>&1 &`,
    // `nohup java -jar "${jarPath}" > "$AZ_BATCH_NODE_MOUNTS_DIR/${relativeMountPath}/iot-2.log" 2>&1 &`,
    // `nohup java -jar "${jarPath}" > "$AZ_BATCH_NODE_MOUNTS_DIR/${relativeMountPath}/iot-3.log" 2>&1 &`,
    'wait',
    // ].join("; "));
    ].join("\n"));

    for (let i = 0; i < targetDedicatedNodes * maxTasksPerNode; i++) {
        let newtaskId = taskId.concat("-", String(i)); // taskId에 랜덤 UUID를 붙여서 고유하게 생성
        // BlobFuse 마운트 디렉터리를 기본 접근하려면 task를 admin(root)로 실행하라고 문서에 안내됨
        const taskConfig = {
        id: newtaskId,
        commandLine: taskCmd,
        userIdentity: {
            autoUser: { elevationLevel: "admin", scope: "task" }, // root 실행
        },
        requiredSlots: 1, // 노드당 하나의 task만 실행하도록 설정 (Blob 마운트 안정성 위해 권장)
        };

        console.log("Adding task:", newtaskId);
        await batchClient.task.add(jobId, taskConfig);
    }
    console.log("Submitted. Check Task stdout/stderr in Portal or Batch Explorer.");
    console.log("Network note: Blob mount requires TCP 443 and access to packages.microsoft.com for blobfuse/gpg packages.");
    }

    main().catch((e) => {
    console.error("FAILED:", e?.response?.body || e);
    process.exit(1);
});