import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function getManagementEndpoint() {
  // Debes poner esto como env: https://{apiId}.execute-api.{region}.amazonaws.com/{stage}
  // Ej: https://abc123.execute-api.us-east-1.amazonaws.com/prod
  const endpoint = process.env.WS_MANAGEMENT_ENDPOINT;
  if (!endpoint) {
    throw new Error("Missing WS_MANAGEMENT_ENDPOINT env var");
  }
  return endpoint;
}

/**
 * Notifica a una lista de usuarios por WebSocket.
 * Dynamo schema:
 *  - pk = `user:<userId>`, sk = `conn:<connectionId>`
 *  - pk = `conn:<connectionId>`, sk = `meta`
 */
export async function notifyUsers(userIds, payload) {
  const api = new ApiGatewayManagementApiClient({
    endpoint: getManagementEndpoint(),
  });

  const table = process.env.WS_CONNECTIONS_TABLE;
  console.log("[NOTIFY] START");
  console.log("[NOTIFY] table:", table);
  console.log("[NOTIFY] userIds:", userIds);
  console.log("[NOTIFY] payload type:", payload?.type);
  for (const uid of userIds) {
    const userId = String(uid);

    // Traer todas las conexiones activas del usuario
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
    if (items.length === 0) continue;

    for (const item of items) {
      const connectionId = item.connectionId;

      try {
        await api.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(JSON.stringify(payload)),
          })
        );
      } catch (err) {
        // Si la conexión ya murió (usuario cerró navegador / perdió red)
        const name = err?.name || "";
        const status = err?.$metadata?.httpStatusCode;

        if (name.includes("Gone") || status === 410) {
          // Limpieza: borrar los dos items relacionados
          try {
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
          } catch (cleanupErr) {
            console.error("WS cleanup error:", cleanupErr);
          }
        } else {
          console.error("postToConnection error:", err);
        }
      }
    }
  }
}
 