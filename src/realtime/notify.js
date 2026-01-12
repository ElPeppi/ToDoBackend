import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function getManagementEndpoint() {
  const endpoint = process.env.WS_MANAGEMENT_ENDPOINT;
  if (!endpoint) throw new Error("Missing WS_MANAGEMENT_ENDPOINT env var");
  return endpoint;
}

export async function notifyUsers(userIds, payload) {
  const table = process.env.WS_CONNECTIONS_TABLE;

  console.log("[NOTIFY] START");
  console.log("[NOTIFY] table:", table);
  console.log("[NOTIFY] userIds:", userIds);
  console.log("[NOTIFY] payload:", payload); // <-- log completo por ahora

  try {
    const api = new ApiGatewayManagementApiClient({
      endpoint: getManagementEndpoint(),
    });

    for (const uid of userIds) {
      const userId = String(uid);

      console.log(`[NOTIFY] querying connections for user:${userId}`);

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

      const items = res.Items || [];
      console.log(
        `[NOTIFY] user:${userId} -> connections found:`,
        items.map(i => i.connectionId)
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
          console.error(
            `[NOTIFY] ❌ postToConnection error for ${connectionId}`,
            err?.name,
            err?.message,
            err?.$metadata?.httpStatusCode
          );

          const name = err?.name || "";
          const status = err?.$metadata?.httpStatusCode;

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
  } catch (err) {
    console.error("[NOTIFY] FATAL ERROR:", err?.name, err?.message, err);
    throw err; // para que quede registrado si rompe
  }
}
