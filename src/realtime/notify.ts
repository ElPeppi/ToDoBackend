import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

type NotifyPayload = Record<string, unknown>;

type ConnectionItem = {
  pk: string;
  sk: string;
  connectionId: string;
};

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function getManagementEndpoint(): string {
  const endpoint = process.env.WS_MANAGEMENT_ENDPOINT;
  if (!endpoint) throw new Error("Missing WS_MANAGEMENT_ENDPOINT env var");
  return endpoint;
}

function getConnectionsTable(): string {
  const table = process.env.WS_CONNECTIONS_TABLE;
  if (!table) throw new Error("Missing WS_CONNECTIONS_TABLE env var");
  return table;
}

export async function notifyUsers(
  userIds: Array<string | number>,
  payload: NotifyPayload
): Promise<void> {
  const table = getConnectionsTable();

  console.log("[NOTIFY] START");
  console.log("[NOTIFY] table:", table);
  console.log("[NOTIFY] userIds:", userIds);
  console.log("[NOTIFY] payload:", payload);

  const api = new ApiGatewayManagementApiClient({
    endpoint: getManagementEndpoint(),
  });

  for (const uid of userIds) {
    const userId = String(uid);

    console.log(`[NOTIFY] querying connections for user:${userId}`);
    console.log("[NOTIFY] endpoint:", process.env.WS_MANAGEMENT_ENDPOINT);

    const res = await ddb.send(
      new QueryCommand({
        TableName: table,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :connPrefix)",
        ExpressionAttributeValues: {
          ":pk": `user:${userId}`,
          ":connPrefix": "conn:",
        },
      })
    );

    // Dynamo devuelve Items como Record<string, any>[]; lo casteamos a nuestro shape esperado.
    const items = (res.Items ?? []) as unknown as ConnectionItem[];

    console.log(
      `[NOTIFY] user:${userId} -> connections found:`,
      items.map((i) => i.connectionId)
    );

    for (const item of items) {
      const connectionId = item.connectionId;

      try {
        console.log(`[NOTIFY] sending to connection:${connectionId}`);

        await api.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(JSON.stringify(payload)),
          })
        );

        console.log(`[NOTIFY] ✅ sent to ${connectionId}`);
      } catch (err) {
        // Tipado defensivo del error del AWS SDK
        const e = err as {
          name?: string;
          message?: string;
          $metadata?: { httpStatusCode?: number };
        };

        console.error(
          `[NOTIFY] ❌ postToConnection error for ${connectionId}`,
          e?.name,
          e?.message,
          e?.$metadata?.httpStatusCode
        );

        const name = e?.name ?? "";
        const status = e?.$metadata?.httpStatusCode;

        if (name.includes("Gone") || status === 410) {
          console.log(`[NOTIFY] cleaning dead connection:${connectionId}`);

          await ddb.send(
            new DeleteCommand({
              TableName: table,
              Key: { pk: `user:${userId}`, sk: `conn:${connectionId}` },
            })
          );

          await ddb.send(
            new DeleteCommand({
              TableName: table,
              Key: { pk: `conn:${connectionId}`, sk: "meta" },
            })
          );
        }
      }
    }
  }

  console.log("[NOTIFY] DONE");
}
